package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"devlab/backend-go/internal/auth"
	"devlab/backend-go/internal/http/middleware"
	"devlab/backend-go/internal/session"

	"github.com/go-chi/chi/v5"
)

type AuthHandler struct {
	db             *sql.DB
	sessions       *session.Repository
	jwtSecret      string
	jwtTTLMinutes  int
	refreshTTLDays int
}

func NewAuthHandler(db *sql.DB, sessions *session.Repository, jwtSecret string, jwtTTLMinutes, refreshTTLDays int) *AuthHandler {
	return &AuthHandler{
		db:             db,
		sessions:       sessions,
		jwtSecret:      jwtSecret,
		jwtTTLMinutes:  jwtTTLMinutes,
		refreshTTLDays: refreshTTLDays,
	}
}

type registerRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type logoutRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type authResponse struct {
	Token        string       `json:"token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresInMin int          `json:"expires_in_minutes"`
	User         responseUser `json:"user"`
}

type responseUser struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type sessionResponse struct {
	ID         int64     `json:"id"`
	UserAgent  string    `json:"user_agent,omitempty"`
	IPAddress  string    `json:"ip_address,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
	LastUsedAt time.Time `json:"last_used_at"`
	ExpiresAt  time.Time `json:"expires_at"`
	Current    bool      `json:"current"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Name == "" || req.Email == "" || len(req.Password) < 8 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name, email, and password(min 8 chars) are required"})
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to secure password"})
		return
	}

	result, err := h.db.Exec(`INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)`, req.Name, req.Email, hash)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "email already exists"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create user"})
		return
	}

	userID, err := result.LastInsertId()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to read user id"})
		return
	}

	resp, err := h.issueTokens(r, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	resp.User = responseUser{ID: userID, Name: req.Name, Email: req.Email}

	writeJSON(w, http.StatusCreated, resp)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Email == "" || req.Password == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "email and password are required"})
		return
	}

	var user responseUser
	var passwordHash string
	err := h.db.QueryRow(`SELECT id, name, email, password_hash FROM users WHERE email = ?`, req.Email).Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&passwordHash,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid email or password"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to read user"})
		return
	}

	if err := auth.CheckPassword(req.Password, passwordHash); err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid email or password"})
		return
	}

	resp, err := h.issueTokens(r, user.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	resp.User = user

	writeJSON(w, http.StatusOK, resp)
}

// Refresh exchanges a valid, unexpired, unrevoked refresh token for a new access
// token, rotating the refresh token in the same call so a captured old token
// cannot be replayed afterwards.
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req refreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.RefreshToken) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "refresh_token is required"})
		return
	}

	sess, err := h.sessions.FindActiveByHash(r.Context(), auth.HashRefreshToken(req.RefreshToken))
	if errors.Is(err, session.ErrNotFound) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid or expired refresh token"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to validate refresh token"})
		return
	}

	newRefreshToken, err := auth.GenerateRefreshToken()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to generate refresh token"})
		return
	}
	newExpiresAt := time.Now().AddDate(0, 0, h.refreshTTLDays)
	if err := h.sessions.RotateToken(r.Context(), sess.ID, auth.HashRefreshToken(newRefreshToken), newExpiresAt); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to rotate session"})
		return
	}

	accessToken, err := auth.GenerateToken(h.jwtSecret, sess.UserID, sess.ID, h.jwtTTLMinutes)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to generate token"})
		return
	}

	writeJSON(w, http.StatusOK, authResponse{
		Token:        accessToken,
		RefreshToken: newRefreshToken,
		ExpiresInMin: h.jwtTTLMinutes,
	})
}

// Logout revokes one session: the session tied to the given refresh token if
// provided in the body, otherwise the session the current access token belongs to.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var req logoutRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	sessionID, hasSessionID := middleware.SessionIDFromContext(r.Context())

	if strings.TrimSpace(req.RefreshToken) != "" {
		if sess, err := h.sessions.FindActiveByHash(r.Context(), auth.HashRefreshToken(req.RefreshToken)); err == nil {
			sessionID = sess.ID
			hasSessionID = true
		}
	}

	if !hasSessionID {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "no session to revoke"})
		return
	}

	if err := h.sessions.Revoke(r.Context(), sessionID, userID); err != nil && !errors.Is(err, session.ErrNotFound) {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to revoke session"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "logged out"})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var user responseUser
	err := h.db.QueryRow(`SELECT id, name, email FROM users WHERE id = ?`, userID).Scan(&user.ID, &user.Name, &user.Email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "user not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to read user"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]responseUser{"user": user})
}

// ListSessions returns every active (non-revoked, unexpired) session for the
// authenticated user, flagging which one belongs to the current request.
func (h *AuthHandler) ListSessions(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	currentSessionID, _ := middleware.SessionIDFromContext(r.Context())

	sessions, err := h.sessions.ListActiveByUser(r.Context(), userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to list sessions"})
		return
	}

	out := make([]sessionResponse, 0, len(sessions))
	for _, s := range sessions {
		out = append(out, sessionResponse{
			ID:         s.ID,
			UserAgent:  s.UserAgent,
			IPAddress:  s.IPAddress,
			CreatedAt:  s.CreatedAt,
			LastUsedAt: s.LastUsedAt,
			ExpiresAt:  s.ExpiresAt,
			Current:    s.ID == currentSessionID,
		})
	}

	writeJSON(w, http.StatusOK, map[string]any{"sessions": out})
}

// RevokeSession lets a user log out a specific device/session by id (a
// "log out other devices" style action), scoped so a user can only revoke
// their own sessions.
func (h *AuthHandler) RevokeSession(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	idStr := chi.URLParam(r, "sessionID")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid session id"})
		return
	}

	if err := h.sessions.Revoke(r.Context(), id, userID); err != nil {
		if errors.Is(err, session.ErrNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "session not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to revoke session"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "session revoked"})
}

// issueTokens creates a new session row (bound to this request's device info)
// and returns a fresh access token + refresh token pair.
func (h *AuthHandler) issueTokens(r *http.Request, userID int64) (authResponse, error) {
	refreshToken, err := auth.GenerateRefreshToken()
	if err != nil {
		return authResponse{}, errors.New("failed to generate refresh token")
	}

	expiresAt := time.Now().AddDate(0, 0, h.refreshTTLDays)
	sessionID, err := h.sessions.Create(r.Context(), userID, auth.HashRefreshToken(refreshToken), r.UserAgent(), clientIP(r), expiresAt)
	if err != nil {
		return authResponse{}, errors.New("failed to create session")
	}

	accessToken, err := auth.GenerateToken(h.jwtSecret, userID, sessionID, h.jwtTTLMinutes)
	if err != nil {
		return authResponse{}, errors.New("failed to generate token")
	}

	return authResponse{
		Token:        accessToken,
		RefreshToken: refreshToken,
		ExpiresInMin: h.jwtTTLMinutes,
	}, nil
}

func clientIP(r *http.Request) string {
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		parts := strings.Split(fwd, ",")
		return strings.TrimSpace(parts[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
