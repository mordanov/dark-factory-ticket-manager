# Developer Quickstart: Ticket Management System

**Branch**: `001-ticket-management-system`

This guide gets a local development environment running from scratch. It covers
backend, frontend, database, and the basic end-to-end flow to verify your setup.

---

## Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| Python | 3.11 | Use `pyenv` or system package manager |
| Node.js | 20 LTS | Use `nvm` or system package manager |
| PostgreSQL | 15 | Local install or Docker |
| Docker | 24 (optional) | For Postgres-in-container setup |

---

## 1. Clone and Repository Layout

```bash
git clone <repo-url>
cd ticket-manager
```

```
ticket-manager/
├── backend/        # FastAPI Python service
├── frontend/       # React TypeScript SPA
└── specs/          # Specification artifacts (non-executable)
```

---

## 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt   # test and lint tools

# Copy environment template
cp .env.example .env
```

Edit `.env` — minimum required values:

```dotenv
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/ticket_manager
SECRET_KEY=<random-256-bit-hex>       # used for JWT signing
REFRESH_TOKEN_SECRET=<random-256-bit-hex>
ENVIRONMENT=development
LOG_LEVEL=INFO
```

### 2a. Database

**Option A — local PostgreSQL:**

```bash
createdb ticket_manager
```

**Option B — Docker:**

```bash
docker run -d --name tms-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ticket_manager \
  -p 5432:5432 postgres:15
```

### 2b. Run Migrations

```bash
alembic upgrade head
```

Expected output: 8 migration steps (`001` through `008`), each confirming `Running upgrade`.

### 2c. Seed a Test User (optional)

```bash
python scripts/seed_dev.py
# Creates: admin@example.com / admin123 (administrator)
#          user@example.com  / user123  (user)
```

### 2d. Start the API

```bash
uvicorn src.main:app --reload --port 8000
```

Verify:
- `GET http://localhost:8000/health` → `{"status": "ok"}`
- `GET http://localhost:8000/ready` → `{"status": "ready"}`
- `GET http://localhost:8000/api/v1/docs` → Interactive OpenAPI UI

---

## 3. Frontend Setup

```bash
cd ../frontend

npm install

cp .env.example .env.local
```

Edit `.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:8000
```

### 3a. Start Dev Server

```bash
npm run dev
```

Visit `http://localhost:5173` — login with seeded credentials.

---

## 4. End-to-End Smoke Test

Use the OpenAPI UI (`/api/v1/docs`) or `curl` to verify the core flow:

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"user123"}' \
  | jq -r .access_token)

# 2. Create a ticket (replace PROJECT_ID with a real UUID from seed data)
curl -s -X POST http://localhost:8000/api/v1/projects/$PROJECT_ID/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"First ticket","description":"Smoke test"}'

# 3. Check activity history
curl -s http://localhost:8000/api/v1/tickets/$TICKET_ID/events \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Expected: the `ticket.created` event appears in the history with your user ID.

---

## 5. Running Tests

### Backend

```bash
cd backend
pytest                              # all tests
pytest tests/unit/                  # unit tests only
pytest tests/integration/           # requires live PostgreSQL
pytest tests/contract/              # contract tests against openapi.yaml
```

### Frontend

```bash
cd frontend
npm test                            # Vitest watch mode
npm run test:run                    # single-run (CI)
```

---

## 6. Common Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `connection refused` on port 5432 | Postgres not running | Start Postgres or Docker container |
| `alembic: command not found` | venv not activated | `source .venv/bin/activate` |
| `401 Unauthorized` on all endpoints | Token expired (30-min TTL) | Re-login to get a fresh token |
| Transition returns 422 with `missing_updates` | Not all assignees have submitted progress | Each assignee must `PUT /tickets/{id}/progress` before transitioning |

---

## 7. Key Files for Onboarding

| File | Purpose |
|------|---------|
| `backend/src/services/workflow_service.py` | Workflow transition rules and progress gate |
| `backend/src/services/event_service.py` | Event emission for all domain actions |
| `backend/src/api/v1/transitions.py` | Status transition endpoint |
| `backend/alembic/versions/` | All schema migrations |
| `specs/001-ticket-management-system/contracts/openapi.yaml` | Full API contract |
| `specs/001-ticket-management-system/data-model.md` | Entity definitions and relationships |
