package session

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

var ErrNotFound = errors.New("session not found")

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// Create inserts a new session row and returns its ID. tokenHash must be the
// SHA-256 hex digest of the refresh token handed to the client (see auth.HashRefreshToken).
func (r *Repository) Create(ctx context.Context, userID int64, tokenHash, userAgent, ipAddress string, expiresAt time.Time) (int64, error) {
	result, err := r.db.ExecContext(ctx, `
		INSERT INTO sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
		VALUES (?, ?, ?, ?, ?)`,
		userID, tokenHash, userAgent, ipAddress, expiresAt,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// FindActiveByHash looks up a session by its refresh token hash, only returning
// sessions that are neither revoked nor expired.
func (r *Repository) FindActiveByHash(ctx context.Context, tokenHash string) (Session, error) {
	var s Session
	err := r.db.QueryRowContext(ctx, `
		SELECT id, user_id, COALESCE(user_agent, ''), COALESCE(ip_address, ''), created_at, last_used_at, expires_at
		FROM sessions
		WHERE refresh_token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()`,
		tokenHash,
	).Scan(&s.ID, &s.UserID, &s.UserAgent, &s.IPAddress, &s.CreatedAt, &s.LastUsedAt, &s.ExpiresAt)
	if errors.Is(err, sql.ErrNoRows) {
		return Session{}, ErrNotFound
	}
	if err != nil {
		return Session{}, err
	}
	return s, nil
}

// ListActiveByUser returns every non-revoked, unexpired session for a user, most
// recently used first — used to power a "manage your devices" UI.
func (r *Repository) ListActiveByUser(ctx context.Context, userID int64) ([]Session, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, user_id, COALESCE(user_agent, ''), COALESCE(ip_address, ''), created_at, last_used_at, expires_at
		FROM sessions
		WHERE user_id = ? AND revoked_at IS NULL AND expires_at > NOW()
		ORDER BY last_used_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Session
	for rows.Next() {
		var s Session
		if err := rows.Scan(&s.ID, &s.UserID, &s.UserAgent, &s.IPAddress, &s.CreatedAt, &s.LastUsedAt, &s.ExpiresAt); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// RotateToken replaces a session's refresh token hash and expiry, used on every
// /api/auth/refresh call so a stolen refresh token stops working the moment it's
// been used once by its legitimate owner (refresh token rotation).
func (r *Repository) RotateToken(ctx context.Context, id int64, newTokenHash string, newExpiresAt time.Time) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE sessions SET refresh_token_hash = ?, expires_at = ?, last_used_at = NOW() WHERE id = ?`,
		newTokenHash, newExpiresAt, id)
	return err
}

// Revoke marks a session as logged out. Scoped to userID so a user can only ever
// revoke their own sessions.
func (r *Repository) Revoke(ctx context.Context, id, userID int64) error {
	result, err := r.db.ExecContext(ctx, `
		UPDATE sessions SET revoked_at = NOW() WHERE id = ? AND user_id = ? AND revoked_at IS NULL`, id, userID)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}

// RevokeAllForUser logs out every session for a user (e.g. on password change).
func (r *Repository) RevokeAllForUser(ctx context.Context, userID int64) error {
	_, err := r.db.ExecContext(ctx, `UPDATE sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`, userID)
	return err
}
