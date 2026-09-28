package session

import "time"

// Session represents one logged-in device/browser for a user, identified by a
// hashed refresh token. Access tokens (JWTs) reference a session by ID so a
// session can be revoked (logout) independently of the short-lived access token.
type Session struct {
	ID         int64     `json:"id"`
	UserID     int64     `json:"user_id"`
	UserAgent  string    `json:"user_agent,omitempty"`
	IPAddress  string    `json:"ip_address,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
	LastUsedAt time.Time `json:"last_used_at"`
	ExpiresAt  time.Time `json:"expires_at"`
}
