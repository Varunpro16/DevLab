package handlers

import (
	"net/http"

	"devlab/backend-go/internal/terminal"
)

type TerminalHandler struct {
	project *ProjectHandler
}

func NewTerminalHandler(project *ProjectHandler) *TerminalHandler {
	return &TerminalHandler{project: project}
}

// Serve upgrades the connection to a WebSocket and attaches it to the project's pod shell.
// Ownership is verified before the pod name is resolved, so a user can never open a
// terminal into another user's environment.
func (h *TerminalHandler) Serve(w http.ResponseWriter, r *http.Request) {
	p, ok := h.project.loadOwnedProject(w, r)
	if !ok {
		return
	}

	status, err := h.project.env.PodStatus(r.Context(), p.Namespace, p.DeploymentName)
	if err != nil || status.PodName == "" {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "no running pod for this project"})
		return
	}

	terminal.ServeKubectlExec(w, r, p.Namespace, status.PodName)
}
