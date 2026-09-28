package middleware

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"devlab/backend-go/internal/auth"
)

type contextKey string

const (
	userIDContextKey    contextKey = "userID"
	sessionIDContextKey contextKey = "sessionID"
)

func Auth(secret string) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tokenString, err := extractToken(r)
			if err != nil {
				http.Error(w, err.Error(), http.StatusUnauthorized)
				return
			}

			claims, err := auth.ParseToken(secret, tokenString)
			if err != nil {
				http.Error(w, "invalid or expired token", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), userIDContextKey, claims.UserID)
			ctx = context.WithValue(ctx, sessionIDContextKey, claims.SessionID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// extractToken reads the bearer token from the Authorization header, falling back
// to a `?token=` query parameter so browser WebSocket clients (which cannot set
// custom headers on the upgrade request) can still authenticate.
func extractToken(r *http.Request) (string, error) {
	if authHeader := r.Header.Get("Authorization"); authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return "", errors.New("invalid Authorization format")
		}
		return parts[1], nil
	}

	if tokenParam := r.URL.Query().Get("token"); tokenParam != "" {
		return tokenParam, nil
	}

	return "", errors.New("missing Authorization header")
}

func UserIDFromContext(ctx context.Context) (int64, bool) {
	v := ctx.Value(userIDContextKey)
	userID, ok := v.(int64)
	return userID, ok
}

func SessionIDFromContext(ctx context.Context) (int64, bool) {
	v := ctx.Value(sessionIDContextKey)
	sessionID, ok := v.(int64)
	return sessionID, ok
}
