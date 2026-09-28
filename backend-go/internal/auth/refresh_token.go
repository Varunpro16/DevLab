package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
)

// GenerateRefreshToken returns a cryptographically random, URL-safe opaque token
// to hand to the client. Only its hash is ever stored server-side.
func GenerateRefreshToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate refresh token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

// HashRefreshToken returns the SHA-256 hex digest of a refresh token. This digest,
// never the raw token, is what gets persisted so a leaked database dump cannot be
// replayed as a valid session credential.
func HashRefreshToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
