package handlers

import (
	"encoding/json"
	"net/http"
	"path"
	"strings"

	"devlab/backend-go/internal/storage"
)

type FileHandler struct {
	project *ProjectHandler
	s3      *storage.Manager
}

func NewFileHandler(project *ProjectHandler, s3 *storage.Manager) *FileHandler {
	return &FileHandler{project: project, s3: s3}
}

func (h *FileHandler) Tree(w http.ResponseWriter, r *http.Request) {
	p, ok := h.project.loadOwnedProject(w, r)
	if !ok {
		return
	}

	subPath := strings.TrimPrefix(r.URL.Query().Get("path"), "/")
	prefix := p.S3Prefix()
	if subPath != "" {
		prefix = path.Join(prefix, subPath) + "/"
	}

	nodes, err := h.s3.Tree(r.Context(), prefix)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to list files: " + err.Error()})
		return
	}
	// Strip the S3 prefix from each node's path so the frontend only ever
	// deals with paths relative to the project root, not internal bucket layout.
	for i := range nodes {
		nodes[i].Path = strings.TrimPrefix(nodes[i].Path, p.S3Prefix())
	}
	writeJSON(w, http.StatusOK, map[string]any{"files": nodes})
}

func (h *FileHandler) Read(w http.ResponseWriter, r *http.Request) {
	p, ok := h.project.loadOwnedProject(w, r)
	if !ok {
		return
	}

	filePath := strings.TrimPrefix(r.URL.Query().Get("path"), "/")
	if filePath == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "path is required"})
		return
	}

	key := path.Join(p.S3Prefix(), filePath)
	content, err := h.s3.ReadFile(r.Context(), key)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "file not found"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"content": content})
}

type writeFileRequest struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

func (h *FileHandler) Write(w http.ResponseWriter, r *http.Request) {
	p, ok := h.project.loadOwnedProject(w, r)
	if !ok {
		return
	}

	var req writeFileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	req.Path = strings.TrimPrefix(req.Path, "/")
	if req.Path == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "path is required"})
		return
	}

	key := path.Join(p.S3Prefix(), req.Path)
	if err := h.s3.WriteFile(r.Context(), key, req.Content); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to save file: " + err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "file saved"})
}

type createFolderRequest struct {
	Path string `json:"path"`
}

func (h *FileHandler) CreateFolder(w http.ResponseWriter, r *http.Request) {
	p, ok := h.project.loadOwnedProject(w, r)
	if !ok {
		return
	}

	var req createFolderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	req.Path = strings.TrimPrefix(req.Path, "/")
	if req.Path == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "path is required"})
		return
	}

	key := path.Join(p.S3Prefix(), req.Path)
	if err := h.s3.CreateFolder(r.Context(), key); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create folder: " + err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "folder created"})
}
