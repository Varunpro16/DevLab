# DevLab Go Backend

Go control-plane service for the Replit-clone: authentication, project lifecycle,
S3-backed file storage, and Kubernetes-provisioned Node/React dev environments with
a browser terminal.

## Implemented endpoints

Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh` — exchange a refresh token for a new access+refresh token pair (rotates the refresh token)
- `POST /api/auth/logout` — revoke the current session (or one identified by `refresh_token` in the body)
- `GET /api/auth/me` (Bearer token)
- `GET /api/auth/sessions` — list your active sessions/devices (Bearer token)
- `DELETE /api/auth/sessions/{sessionID}` — revoke a specific session (Bearer token)

Projects (all require `Authorization: Bearer <token>`):
- `POST /api/projects` — create project `{ "name": "...", "language": "react"|"node" }`
  - seeds S3 with starter files and provisions a Deployment/Service/Ingress
- `GET /api/projects` — list your projects
- `GET /api/projects/{id}` — project detail
- `GET /api/projects/{id}/status` — live pod phase/readiness
- `POST /api/projects/{id}/start` — scale deployment to 1 replica
- `POST /api/projects/{id}/stop` — scale deployment to 0 replicas
- `DELETE /api/projects/{id}` — tear down environment, delete S3 files + DB row

Files (S3-backed, scoped to a project you own):
- `GET /api/projects/{id}/files?path=` — list tree at path (non-recursive)
- `GET /api/projects/{id}/file?path=` — read file content
- `PUT /api/projects/{id}/file` — write file `{ "path": "...", "content": "..." }`
- `POST /api/projects/{id}/folder` — create folder `{ "path": "..." }`

Terminal:
- `GET /api/projects/{id}/terminal` (WebSocket) — shell into the project's live pod
  via `kubectl exec`, ownership-checked before the pod name is resolved.

Misc:
- `GET /health`

## Stack

- Go + Chi router
- MySQL (`database/sql` + `go-sql-driver/mysql`)
- JWT (`HS256`) + bcrypt password hashing
- AWS SDK v2 (S3 file storage)
- `client-go` (Kubernetes Deployment/Service/Ingress provisioning)
- `gorilla/websocket` + `creack/pty` (terminal gateway over `kubectl exec`)

## Setup

1. Copy environment template and fill in real values:

```bash
cp .env.example .env
```

Required: `DB_PASSWORD`, `JWT_SECRET`, `S3_BUCKET`, `AWS_REGION`. Kubernetes access
uses your default `~/.kube/config` unless `KUBECONFIG_PATH` or `K8S_IN_CLUSTER` is set.
AWS credentials should come from your normal AWS credential chain (env vars, shared
config, or an instance/IRSA role) — never hardcode secrets in code or manifests.

2. Load env vars:

```bash
set -a; source .env; set +a
```

3. Create database + tables:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS devlab;"
mysql -u root -p devlab < migrations/001_create_users.sql
mysql -u root -p devlab < migrations/002_create_projects.sql
mysql -u root -p devlab < migrations/003_create_sessions.sql
```

4. Run:

```bash
go mod tidy
go run ./cmd/server
```

## Example requests

Register + login (see `/api/auth` above), then:

```bash
TOKEN=<paste JWT here>

curl -X POST http://localhost:5001/api/projects \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"my-app","language":"react"}'

curl http://localhost:5001/api/projects -H "Authorization: Bearer $TOKEN"

curl http://localhost:5001/api/projects/1/status -H "Authorization: Bearer $TOKEN"
```

## Sessions

Login/register return both an access token (`token`, short-lived JWT, default 24h
via `JWT_TTL_MINUTES`) and a `refresh_token` (opaque, long-lived, default 30 days
via `REFRESH_TTL_DAYS`). Only a SHA-256 hash of the refresh token is stored in the
`sessions` table — the raw value is never persisted. Each JWT embeds a
`session_id`, so a session can be revoked (logout) independently of the access
token's own expiry.

```bash
# refresh
curl -X POST http://localhost:5001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"<REFRESH_TOKEN>"}'

# list active sessions/devices
curl http://localhost:5001/api/auth/sessions -H "Authorization: Bearer $TOKEN"

# revoke a specific session (log out that device)
curl -X DELETE http://localhost:5001/api/auth/sessions/3 -H "Authorization: Bearer $TOKEN"

# log out the current session
curl -X POST http://localhost:5001/api/auth/logout -H "Authorization: Bearer $TOKEN"
```

## Notes / follow-ups

- Requires a reachable Kubernetes cluster with an `nginx` IngressClass for the
  generated Ingress hosts to actually route traffic.
- The container's startup command runs `aws s3 sync` from the project's S3 prefix
  into `/app`, then `npm install && npm start`. It relies on the pod having AWS
  permissions (IRSA/instance profile) to read `S3_BUCKET` — no credentials are
  embedded in the manifest.
- Pods run non-root, with all Linux capabilities dropped and no privilege escalation.
- Not yet implemented (future phases from the original plan): autosleep/idle
  teardown, desired-vs-actual reconciliation loop, deploy-to-production pipeline
  (build → ECR → public URL), and observability (Prometheus/Grafana).
