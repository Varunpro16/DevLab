## 🔐 Complete Authentication Flow: Registration & Login Deep Dive

Let me walk you through **exactly** what happens during registration and login, what gets stored where, and in what format.

---

# **1️⃣ REGISTRATION FLOW**

## **Client Request:**
```http
POST http://localhost:5001/api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

---

## **Server Processing (Step-by-Step):**

### **Step 1: Password Hashing**

```go
// Input: "SecurePass123"
hash, _ := auth.HashPassword("SecurePass123")

// Uses bcrypt with cost factor 12
// Output: "$2a$12$LQ7Z.../RkJ8K9pL2mN..." (60 characters)
```

**What is bcrypt?**
- One-way hash (can't reverse it to get password)
- Includes random salt (same password = different hashes)
- Adaptive cost (slower = harder to brute force)

**Example:**
```
Input:  "SecurePass123"
Output: "$2a$12$LQvX5F8K/9pRkJ8K9pL2mNeQr3sT4uV5wX6yZ7aB8cD9eF0gH1iJ2"
        ↑    ↑  ↑                                                      
        |    |  |__ Random salt (22 chars)
        |    |_____ Cost factor (2^12 = 4096 iterations)
        |__________ Algorithm version
```

### **Step 2: Store User in Database**

```sql
INSERT INTO users (name, email, password_hash) 
VALUES ('John Doe', 'john@example.com', '$2a$12$LQvX5F8K...');
```

**Database State After Insert:**

```
users table:
┌────┬──────────┬──────────────────┬─────────────────────────────────────────────┬─────────────────────┬─────────────────────┐
│ id │ name     │ email            │ password_hash                               │ created_at          │ updated_at          │
├────┼──────────┼──────────────────┼─────────────────────────────────────────────┼─────────────────────┼─────────────────────┤
│ 5  │ John Doe │ john@example.com │ $2a$12$LQvX5F8K/9pRkJ8K9pL2mNeQr3sT4uV5w... │ 2026-09-28 17:00:00 │ 2026-09-28 17:00:00 │
└────┴──────────┴──────────────────┴─────────────────────────────────────────────┴─────────────────────┴─────────────────────┘
```

**🔒 Security Note:** The actual password `"SecurePass123"` is **NEVER stored**. Only the hash.

---

### **Step 3: Generate Refresh Token**

```go
// Generate 32 random bytes
buf := make([]byte, 32)
rand.Read(buf)  // Fills with cryptographically random data

// Encode to URL-safe base64
refreshToken := base64.RawURLEncoding.EncodeToString(buf)
// Result: "Xj4k9P2mN7qR5sT8vW1yZ3aB4cD5eF6gH7iJ8kL9mN0o"
```

**Example:**
```
Raw bytes:  [5e 3e 8f 13 f6 6b 37 ae 91 e5 b3 3c bd 62 35 ...]
Base64:     "Xj4k9P2mN7qR5sT8vW1yZ3aB4cD5eF6gH7iJ8kL9mN0o"
            ↑
            43 characters, URL-safe (no +, /, =)
```

---

### **Step 4: Hash Refresh Token for Storage**

```go
// NEVER store the raw refresh token!
tokenHash := auth.HashRefreshToken(refreshToken)

// SHA-256 hash
sum := sha256.Sum256([]byte("Xj4k9P2mN7qR5sT8vW1yZ3aB4cD5eF6gH7iJ8kL9mN0o"))
hex.EncodeToString(sum[:])
// Result: "a3f5e8d2c4b1a9e7f6d5c3b2a1f9e8d7c6b5a4f3e2d1c9b8a7f6e5d4c3b2a1f0"
```

**Example:**
```
Input:  "Xj4k9P2mN7qR5sT8vW1yZ3aB4cD5eF6gH7iJ8kL9mN0o"
SHA256: a3f5e8d2c4b1a9e7f6d5c3b2a1f9e8d7c6b5a4f3e2d1c9b8a7f6e5d4c3b2a1f0
        ↑
        64 hex characters (256 bits)
```

**Why hash it?**
- If database is compromised, attacker can't use tokens directly
- One-way function: can't reverse hash to get original token

---

### **Step 5: Create Session Record**

```go
expiresAt := time.Now().AddDate(0, 0, 30)  // 30 days from now

sessionID, _ := h.sessions.Create(
    ctx, 
    userID: 5,
    tokenHash: "a3f5e8d2c4b1a9e7...",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
    ipAddress: "192.168.1.100",
    expiresAt: expiresAt,
)
// Returns: sessionID = 12
```

**SQL Executed:**
```sql
INSERT INTO sessions 
  (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
VALUES 
  (5, 'a3f5e8d2c4b1a9e7...', 'Mozilla/5.0...', '192.168.1.100', '2026-10-28 17:00:00');
```

**Database State:**

```
sessions table:
┌────┬─────────┬──────────────────────────────────────────────────────────────┬────────────────┬───────────────┬─────────────────────┬─────────────────────┬─────────────────────┬────────────┐
│ id │ user_id │ refresh_token_hash                                           │ user_agent     │ ip_address    │ created_at          │ last_used_at        │ expires_at          │ revoked_at │
├────┼─────────┼──────────────────────────────────────────────────────────────┼────────────────┼───────────────┼─────────────────────┼─────────────────────┼─────────────────────┼────────────┤
│ 12 │ 5       │ a3f5e8d2c4b1a9e7f6d5c3b2a1f9e8d7c6b5a4f3e2d1c9b8a7f6e5d4... │ Mozilla/5.0... │ 192.168.1.100 │ 2026-09-28 17:00:00 │ 2026-09-28 17:00:00 │ 2026-10-28 17:00:00 │ NULL       │
└────┴─────────┴──────────────────────────────────────────────────────────────┴────────────────┴───────────────┴─────────────────────┴─────────────────────┴─────────────────────┴────────────┘
```

---

### **Step 6: Generate JWT (Access Token)**

```go
now := time.Now()
claims := Claims{
    UserID:    5,
    SessionID: 12,
    RegisteredClaims: jwt.RegisteredClaims{
        Subject:   "5",
        IssuedAt:  jwt.NewNumericDate(now),                      // 2026-09-28 17:00:00
        ExpiresAt: jwt.NewNumericDate(now.Add(1440*time.Minute)), // 24 hours later
    },
}

token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
accessToken, _ := token.SignedString([]byte("your-jwt-secret-key"))
```

**JWT Structure:**

```
Header (base64):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9

Decoded:
{
  "alg": "HS256",
  "typ": "JWT"
}

---

Payload (base64):
eyJ1c2VyX2lkIjo1LCJzZXNzaW9uX2lkIjoxMiwic3ViIjoiNSIsImlhdCI6MTcyNzUyMTIwMCwiZXhwIjoxNzI3NjA3NjAwfQ

Decoded:
{
  "user_id": 5,
  "session_id": 12,
  "sub": "5",
  "iat": 1727521200,    // Sep 28, 2026, 5:00 PM
  "exp": 1727607600     // Sep 29, 2026, 5:00 PM
}

---

Signature:
HMAC-SHA256(
  base64(header) + "." + base64(payload),
  "your-jwt-secret-key"
)
= "vX4FnK8pL2mQ9jR7wS5tU3vY6zA8bC1dE2fG3hH4iJ5kL6mN7oP8qR9sT0u"

---

Final JWT (all 3 parts joined with dots):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1LCJzZXNzaW9uX2lkIjoxMiwic3ViIjoiNSIsImlhdCI6MTcyNzUyMTIwMCwiZXhwIjoxNzI3NjA3NjAwfQ.vX4FnK8pL2mQ9jR7wS5tU3vY6zA8bC1dE2fG3hH4iJ5kL6mN7oP8qR9sT0u
```

---

### **Step 7: Send Response to Client**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1...",
  "refresh_token": "Xj4k9P2mN7qR5sT8vW1yZ3aB4cD5eF6gH7iJ8kL9mN0o",
  "expires_in_minutes": 1440,
  "user": {
    "id": 5,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

## **Client Storage (Browser):**

### **Option 1: localStorage** (Common but less secure)
```javascript
// Store both tokens
localStorage.setItem('access_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
localStorage.setItem('refresh_token', 'Xj4k9P2mN7qR5sT8vW1yZ3aB4cD5eF6gH7iJ8kL9mN0o');
```

**Browser Storage:**
```
localStorage:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1...",
  "refresh_token": "Xj4k9P2mN7qR5sT8vW1yZ3aB4cD5eF6gH7iJ8kL9mN0o"
}
```

**⚠️ Security Risk:** XSS attacks can steal tokens from localStorage!

### **Option 2: Memory + httpOnly Cookie** (More secure)
```javascript
// Access token in memory (React state/context)
const [accessToken, setAccessToken] = useState('eyJhbGciOi...');

// Refresh token in httpOnly cookie (set by server)
// JavaScript cannot access this cookie!
```

**Browser Cookie Storage:**
```
Set-Cookie: refresh_token=Xj4k9P2mN7qR5sT8vW1yZ3aB4cD5eF6gH7iJ8kL9mN0o; 
            HttpOnly; 
            Secure; 
            SameSite=Strict; 
            Max-Age=2592000
```

---

# **2️⃣ LOGIN FLOW**

## **Client Request:**
```http
POST http://localhost:5001/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

---

## **Server Processing:**

### **Step 1: Find User by Email**

```sql
SELECT id, name, email, password_hash 
FROM users 
WHERE email = 'john@example.com';
```

**Result:**
```
id: 5
name: "John Doe"
email: "john@example.com"
password_hash: "$2a$12$LQvX5F8K/9pRkJ8K9pL2mNeQr3sT4uV5w..."
```

---

### **Step 2: Verify Password**

```go
// Compare input password with stored hash
err := bcrypt.CompareHashAndPassword(
    []byte("$2a$12$LQvX5F8K/9pRkJ8K9pL2mNeQr3sT4uV5w..."),  // stored hash
    []byte("SecurePass123"),                                 // user input
)

if err != nil {
    // Password doesn't match
    return "invalid email or password"
}
// Password matches! ✅
```

**How bcrypt verification works:**
1. Extract salt from stored hash: `$2a$12$LQvX5F8K...`
2. Hash input password with same salt: `bcrypt("SecurePass123", salt)`
3. Compare result with stored hash
4. Match? → Login succeeds

---

### **Step 3-7: Same as Registration**

- Generate new refresh token
- Hash it
- Create new session record (id=13)
- Generate JWT with session_id=13
- Return both tokens

**New Session in Database:**
```
sessions table:
┌────┬─────────┬──────────────────────────────────────────────────────────────┬────────────────┬───────────────┬─────────────────────┐
│ id │ user_id │ refresh_token_hash                                           │ user_agent     │ ip_address    │ created_at          │
├────┼─────────┼──────────────────────────────────────────────────────────────┼────────────────┼───────────────┼─────────────────────┤
│ 12 │ 5       │ a3f5e8d2c4b1a9e7...                                          │ Mozilla/5.0... │ 192.168.1.100 │ 2026-09-28 17:00:00 │ ← Old session
│ 13 │ 5       │ b4g6f9e3d5c2b8a1...                                          │ Chrome/120...  │ 192.168.1.100 │ 2026-09-28 17:05:00 │ ← New login
└────┴─────────┴──────────────────────────────────────────────────────────────┴────────────────┴───────────────┴─────────────────────┘
```

**Note:** User now has **2 active sessions** (logged in from 2 browsers/devices).

---

# **3️⃣ MAKING AUTHENTICATED API CALLS**

## **Client Request:**
```http
GET http://localhost:5001/api/projects
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1...
```

**JavaScript (Axios):**
```javascript
const token = localStorage.getItem('access_token');

axios.get('http://localhost:5001/api/projects', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## **Server Verification (Middleware):**

```go
// 1. Extract token from header
authHeader := "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
tokenString := strings.Split(authHeader, " ")[1]  // "eyJhbGc..."

// 2. Parse and verify JWT
claims, err := auth.ParseToken("your-jwt-secret-key", tokenString)

// Internally:
// - Split into header.payload.signature
// - Recalculate: HMAC-SHA256(header.payload, secret)
// - Compare: calculated == provided signature?
// - Check: exp > current time?

// 3. Extract user info
claims.UserID     // 5
claims.SessionID  // 13

// 4. Inject into request context
ctx = context.WithValue(ctx, "userID", 5)
ctx = context.WithValue(ctx, "sessionID", 13)

// 5. Handler can now access user info
userID := middleware.UserIDFromContext(ctx)  // 5
```

**No database query needed!** JWT is self-contained. ⚡

---

# **4️⃣ TOKEN REFRESH (When JWT Expires)**

## **Problem:**
After 24 hours, JWT expires. Client gets `401 Unauthorized`.

## **Solution:**
Use refresh token to get new JWT without re-entering password.

---

## **Client Request:**
```http
POST http://localhost:5001/api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "Xj4k9P2mN7qR5sT8vW1yZ3aB4cD5eF6gH7iJ8kL9mN0o"
}
```

---

## **Server Processing:**

### **Step 1: Hash Incoming Token**
```go
tokenHash := auth.HashRefreshToken("Xj4k9P2mN7qR5sT8vW1yZ3aB4cD5eF6gH7iJ8kL9mN0o")
// Result: "a3f5e8d2c4b1a9e7f6d5c3b2a1f9e8d7c6b5a4f3e2d1c9b8a7f6e5d4c3b2a1f0"
```

### **Step 2: Find Session**
```sql
SELECT id, user_id, created_at, last_used_at, expires_at
FROM sessions
WHERE refresh_token_hash = 'a3f5e8d2c4b1a9e7...'
  AND revoked_at IS NULL
  AND expires_at > NOW();
```

**Found:** `session_id=12, user_id=5`

### **Step 3: Generate NEW Refresh Token**
```go
newRefreshToken := "Bc7w2Y5zX8vU3tS6rQ9pO1nM4lK7jI0hG3fE6dC9bA2"
newTokenHash := auth.HashRefreshToken(newRefreshToken)
// "d8h2k5m3n6p9r1s4t7v0w3x6y9z2a5b8c1d4e7f0g3h6i9j2k5l8m1n4o7p0"
```

### **Step 4: Update Session (Token Rotation)**
```sql
UPDATE sessions 
SET refresh_token_hash = 'd8h2k5m3n6p9r1s4t7v0w3x6y9z2a5b8c1d4e7f0g3h6i9j2k5l8m1n4o7p0',
    expires_at = '2026-10-29 17:10:00',
    last_used_at = NOW()
WHERE id = 12;
```

**Database State:**
```
sessions table (session 12 updated):
┌────┬─────────┬──────────────────────────────────────────────────────────────┬─────────────────────┬─────────────────────┐
│ id │ user_id │ refresh_token_hash                                           │ last_used_at        │ expires_at          │
├────┼─────────┼──────────────────────────────────────────────────────────────┼─────────────────────┼─────────────────────┤
│ 12 │ 5       │ d8h2k5m3n6p9r1s4t7v0w3x6y9z2a5b8c1d4e7f0g3h6i9j2k5l8m1n4... │ 2026-09-29 17:10:00 │ 2026-10-29 17:10:00 │
└────┴─────────┴──────────────────────────────────────────────────────────────┴─────────────────────┴─────────────────────┘
```

**🔒 Security:** Old token `"Xj4k9P2m..."` is now USELESS! If stolen, attacker can't use it.

### **Step 5: Generate New JWT**
```go
newAccessToken, _ := auth.GenerateToken("your-jwt-secret-key", 5, 12, 1440)
```

### **Step 6: Return New Tokens**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...<NEW>",
  "refresh_token": "Bc7w2Y5zX8vU3tS6rQ9pO1nM4lK7jI0hG3fE6dC9bA2",
  "expires_in_minutes": 1440
}
```

---

# **5️⃣ LOGOUT**

## **Client Request:**
```http
POST http://localhost:5001/api/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "refresh_token": "Bc7w2Y5zX8vU3tS6rQ9pO1nM4lK7jI0hG3fE6dC9bA2"
}
```

## **Server Processing:**

### **Step 1: Extract session_id from JWT**
```go
claims, _ := auth.ParseToken(secret, jwtFromHeader)
sessionID := claims.SessionID  // 12
```

### **Step 2: Revoke Session**
```sql
UPDATE sessions
SET revoked_at = NOW()
WHERE id = 12 AND user_id = 5 AND revoked_at IS NULL;
```

**Database State:**
```
sessions table:
┌────┬─────────┬──────────────────────────────────────────────────────────────┬─────────────────────┬────────────────────┐
│ id │ user_id │ refresh_token_hash                                           │ expires_at          │ revoked_at         │
├────┼─────────┼──────────────────────────────────────────────────────────────┼─────────────────────┼────────────────────┤
│ 12 │ 5       │ d8h2k5m3n6p9...                                              │ 2026-10-29 17:10:00 │ 2026-09-29 17:15:00│ ← REVOKED
└────┴─────────┴──────────────────────────────────────────────────────────────┴─────────────────────┴────────────────────┘
```

### **Effect:**
- ✅ Refresh token no longer works (future `/refresh` calls fail)
- ⚠️ Existing JWT still valid until it expires (stateless limitation)
- 🔒 Best practice: Client should delete tokens from storage

---

# **📊 Complete State Diagram**

```
CLIENT SIDE                          SERVER SIDE
─────────────────────────────────────────────────────────────────────────

REGISTRATION/LOGIN
─────────────────────────────────────────────────────────────────────────
POST /auth/login
{ email, password }
                    ──────────>    Verify password (bcrypt)
                                   Generate refresh token (32 random bytes)
                                   Hash it (SHA-256)
                                   INSERT INTO sessions (...)
                                   Generate JWT (user_id, session_id, exp)
                    <──────────    Return { token, refresh_token }

Store tokens:
• localStorage/memory:
  "access_token": "eyJhbGc..."
  "refresh_token": "Xj4k9P2m..."


API CALL
─────────────────────────────────────────────────────────────────────────
GET /api/projects
Authorization: Bearer eyJhbGc...
                    ──────────>    Parse JWT
                                   Verify signature (HMAC-SHA256)
                                   Check expiration
                                   Extract user_id from claims
                    <──────────    Return user's projects


TOKEN REFRESH (after 24h)
─────────────────────────────────────────────────────────────────────────
POST /auth/refresh
{ refresh_token: "Xj4k9P2m..." }
                    ──────────>    Hash token (SHA-256)
                                   SELECT * FROM sessions WHERE hash=... AND revoked_at IS NULL
                                   Generate NEW refresh token
                                   UPDATE sessions SET hash=new_hash
                                   Generate new JWT
                    <──────────    Return { token: NEW, refresh_token: NEW }

Update storage:
• "access_token": "eyJnEw..."  (NEW)
• "refresh_token": "Bc7w2Y5z..." (NEW)


LOGOUT
─────────────────────────────────────────────────────────────────────────
POST /auth/logout
Authorization: Bearer eyJhbGc...
                    ──────────>    Extract session_id from JWT
                                   UPDATE sessions SET revoked_at=NOW() WHERE id=...
                    <──────────    { message: "logged out" }

Delete tokens from storage
Clear localStorage/memory
```

---

# **🔑 Summary: What Gets Stored Where**

| Data | Client Storage | Server Storage | Format |
|------|---------------|----------------|--------|
| **Password** | ❌ Never | ✅ Hashed only | `$2a$12$LQ...` (bcrypt, 60 chars) |
| **Access Token (JWT)** | ✅ localStorage/memory | ❌ Never | `eyJhbGciOiJ...` (200+ chars) |
| **Refresh Token** | ✅ localStorage/cookie | ✅ Hash only | Raw: `Xj4k9P2m...` (43 chars)<br>Hash: `a3f5e8d2...` (64 chars) |
| **User Info** | ✅ Decoded from JWT | ✅ users table | JSON/Database row |
| **Session Info** | ❌ Never | ✅ sessions table | Database row |

This architecture provides **security, scalability, and usability** - the holy trinity of modern auth! 🚀