package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"devlab/backend-go/internal/config"
	"devlab/backend-go/internal/http/middleware"
	appk8s "devlab/backend-go/internal/kubernetes"
	"devlab/backend-go/internal/project"
	"devlab/backend-go/internal/storage"

	"github.com/go-chi/chi/v5"
)

// languageTemplate describes how a project language maps to its pre-existing S3
// starter template (under "initialsetup/<S3Prefix>/") and its container runtime.
type languageTemplate struct {
	S3Prefix      string
	Image         string
	ContainerPort int32
	StartCommand  string
}

// languageTemplates lists the languages backed by a starter template already
// uploaded to s3://<bucket>/initialsetup/<S3Prefix>/. New projects are seeded by
// copying that prefix rather than generating file content in code.
var languageTemplates = map[string]languageTemplate{
	"react": {
		S3Prefix:      "react",
		Image:         "node:18",
		ContainerPort: 3000,
		StartCommand:  "npm install && npm start",
	},
	"node": {
		S3Prefix:      "nodejs",
		Image:         "node:18",
		ContainerPort: 5000,
		StartCommand:  "npm install || true; node server.js",
	},
	"cpp": {
		S3Prefix:      "cpp",
		Image:         "node:18",
		ContainerPort: 5000,
		StartCommand:  "make && ./main || sleep infinity",
	},
	"python": {
		S3Prefix:      "python",
		Image:         "node:18",
		ContainerPort: 5000,
		StartCommand:  "pip install -r requirements.txt || true; python3 main.py || sleep infinity",
	},
}

var slugPattern = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(name string) string {
	s := slugPattern.ReplaceAllString(strings.ToLower(strings.TrimSpace(name)), "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "project"
	}
	return s
}

type ProjectHandler struct {
	repo *project.Repository
	s3   *storage.Manager
	env  *appk8s.EnvironmentManager
	cfg  config.Config
}

func NewProjectHandler(repo *project.Repository, s3 *storage.Manager, env *appk8s.EnvironmentManager, cfg config.Config) *ProjectHandler {
	return &ProjectHandler{repo: repo, s3: s3, env: env, cfg: cfg}
}

type createProjectRequest struct {
	Name     string `json:"name"`
	Language string `json:"language"`
}

func (h *ProjectHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var req createProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Language = strings.ToLower(strings.TrimSpace(req.Language))
	if req.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name is required"})
		return
	}

	lang, ok := languageTemplates[req.Language]
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "unsupported language: " + req.Language})
		return
	}

	slug := slugify(req.Name)
	namespace := fmt.Sprintf("devlab-user-%d", userID)
	deploymentName := fmt.Sprintf("proj-%s-%d", slug, userID)
	serviceName := deploymentName + "-svc"

	p := project.Project{
		UserID:         userID,
		Name:           req.Name,
		Language:       req.Language,
		Status:         project.StatusStarting,
		Namespace:      namespace,
		DeploymentName: deploymentName,
		ServiceName:    serviceName,
	}

	id, err := h.repo.Create(r.Context(), p) // inserting into project table
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "a project with this name already exists"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create project"})
		return
	}
	p.ID = id

	srcPrefix := fmt.Sprintf("initialsetup/%s", lang.S3Prefix)
	if err := h.s3.CopyPrefix(r.Context(), srcPrefix, p.S3Prefix()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to seed project files: " + err.Error()})
		return
	}

	if err := h.provisionEnvironment(r.Context(), p, lang); err != nil {
		_ = h.repo.UpdateStatus(r.Context(), p.ID, project.StatusFailed, "", "")
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to provision environment: " + err.Error()})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"project": p})
}

func (h *ProjectHandler) provisionEnvironment(ctx context.Context, p project.Project, lang languageTemplate) error {
	// The pod installs the AWS CLI itself, then downloads the entire project
	// from its S3 prefix before running the language start command.
	// APT::Sandbox::User=root is required because the container's SecurityContext
	// drops all Linux capabilities, so apt-get cannot drop privileges to the
	// unprivileged _apt user internally (setuid/setgid would fail otherwise).
	startupCmd := fmt.Sprintf(
		`apt-get update -qq -o APT::Sandbox::User=root && apt-get install -y -qq -o APT::Sandbox::User=root awscli > /dev/null 2>&1; `+
			`aws s3 sync s3://%s/%s /app --exclude "node_modules/*" || echo "s3 sync failed"; `+
			`cd /app && %s`,
		h.cfg.S3Bucket, strings.TrimSuffix(p.S3Prefix(), "/"), lang.StartCommand,
	)

	spec := appk8s.EnvironmentSpec{
		Namespace:      p.Namespace,
		DeploymentName: p.DeploymentName,
		ServiceName:    p.ServiceName,
		AppLabel:       p.DeploymentName,
		Image:          lang.Image,
		Command:        []string{startupCmd},
		ContainerPort:  lang.ContainerPort,
		Env: map[string]string{
			"AWS_REGION":            h.cfg.AWSRegion,
			"AWS_ACCESS_KEY_ID":     h.cfg.AWSAccessKeyID,
			"AWS_SECRET_ACCESS_KEY": h.cfg.AWSSecretAccessKey,
		},
	}

	if err := h.env.CreateEnvironment(ctx, spec); err != nil {
		return err
	}

	publicURL := fmt.Sprintf("http://%s-%s.%s", p.DeploymentName, p.Namespace, h.cfg.IngressDomain)
	return h.repo.UpdateStatus(ctx, p.ID, project.StatusRunning, "", publicURL)
}

func (h *ProjectHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	list, err := h.repo.ListByUser(r.Context(), userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to list projects"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"projects": list})
}

func (h *ProjectHandler) Get(w http.ResponseWriter, r *http.Request) {
	p, ok := h.loadOwnedProject(w, r)
	if !ok {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"project": p})
}

func (h *ProjectHandler) Status(w http.ResponseWriter, r *http.Request) {
	p, ok := h.loadOwnedProject(w, r)
	if !ok {
		return
	}

	status, err := h.env.PodStatus(r.Context(), p.Namespace, p.DeploymentName)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to read status: " + err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"project": p, "pod": status})
}

func (h *ProjectHandler) Start(w http.ResponseWriter, r *http.Request) {
	p, ok := h.loadOwnedProject(w, r)
	if !ok {
		return
	}
	if err := h.env.Scale(r.Context(), p.Namespace, p.DeploymentName, 1); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to start: " + err.Error()})
		return
	}
	_ = h.repo.UpdateStatus(r.Context(), p.ID, project.StatusRunning, p.PodName, p.PublicURL)
	writeJSON(w, http.StatusOK, map[string]string{"message": "project started"})
}

func (h *ProjectHandler) Stop(w http.ResponseWriter, r *http.Request) {
	p, ok := h.loadOwnedProject(w, r)
	if !ok {
		return
	}
	if err := h.env.Scale(r.Context(), p.Namespace, p.DeploymentName, 0); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to stop: " + err.Error()})
		return
	}
	_ = h.repo.UpdateStatus(r.Context(), p.ID, project.StatusStopped, "", p.PublicURL)
	writeJSON(w, http.StatusOK, map[string]string{"message": "project stopped"})
}

func (h *ProjectHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	p, ok := h.loadOwnedProject(w, r)
	if !ok {
		return
	}

	if err := h.env.Delete(r.Context(), p.Namespace, p.DeploymentName, p.ServiceName, p.DeploymentName); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to tear down environment: " + err.Error()})
		return
	}
	if err := h.s3.DeletePrefix(r.Context(), p.S3Prefix()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to delete project files: " + err.Error()})
		return
	}
	if err := h.repo.Delete(r.Context(), p.ID, userID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to delete project record"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "project deleted"})
}

// loadOwnedProject resolves the :projectID route param and verifies the authenticated
// user owns it, writing an error response and returning ok=false on any failure.
func (h *ProjectHandler) loadOwnedProject(w http.ResponseWriter, r *http.Request) (project.Project, bool) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return project.Project{}, false
	}

	idStr := chi.URLParam(r, "projectID")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid project id"})
		return project.Project{}, false
	}

	p, err := h.repo.GetByIDForUser(r.Context(), id, userID)
	if errors.Is(err, project.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "project not found"})
		return project.Project{}, false
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to load project"})
		return project.Project{}, false
	}
	return p, true
}
