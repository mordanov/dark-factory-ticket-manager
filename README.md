# Ticket Management System

A web application for tracking software delivery lifecycle progress across projects. Teams create and manage tickets, assign them to one or more users, and track per-assignee progress through a defined status workflow. The system also supports three-language UI localization, six selectable UI color themes, admin user lifecycle management (create/edit/block/unblock), and URL-persisted board/list navigation. Every ticket action is recorded as an immutable timestamped event, forming a complete auditable history.

## Features

### UI Personalization
- **Three-language interface** — full UI localization in English (`en`), Russian (`ru`), and Spanish (`es`)
- **Language switcher on every page** — language changes apply immediately without full page reload
- **Persistent language preference** — selected language is stored in `localStorage` (`lang` key), defaulting to English for first-time users and falling back to English for missing strings
- **Six accessible themes** — `light`, `dark`, `solarized`, `oceanic`, `high-contrast`, and `warm`
- **Persistent theme preference** — selected theme is stored in `localStorage` (`theme` key) and applied at app startup via `data-theme`

### Admin User Management
- **Admin-only user management page** — `/admin/users` is accessible to `administrator` users only
- **User lifecycle controls** — administrators can create users, edit user email/role, block users, and unblock users
- **No user deletion** — accounts are retained; blocking is the deactivation mechanism
- **Self-protection rule** — administrators cannot block their own account (service-layer enforced)
- **Blocked login enforcement** — blocked users receive HTTP 403 on next login attempt with: `"Your account has been blocked. Contact an administrator."`

### Persistent URL Navigation
- Project board/list view is URL-backed via `?view=list|board`
- Refreshing or sharing project URLs preserves the current selected view
- Ticket detail pages remain directly addressable and refresh-safe via `/tickets/{ticketId}`

### Ticket Lifecycle
- **Primary tickets** — created within a project namespace with a title, description, and initial `OPEN` status
- **Follow-up tickets** — any authenticated user can create a follow-up linked to an existing ticket, inheriting its project namespace
- **Edit and delete** — ticket creators can edit title/description; deletion is blocked when active follow-up tickets exist (soft-delete: data retained for audit)

### Multi-Assignee Collaboration
- A ticket can be assigned to one or more users simultaneously
- Each assignee independently submits their own progress update (one updateable record per assignee)
- Status transitions are gated: **every assigned user must submit a progress update** before a transition is permitted
- The API identifies which assignees have not yet submitted when a transition is blocked

### Status Workflow
Hard-coded lifecycle enforced by `WorkflowService`:

```
OPEN → IN_PROGRESS → IN_REVIEW → DONE → CLOSED
                         ↓
                    IN_PROGRESS   (back from IN_REVIEW)
                         ↑
                      DONE        (back from DONE to IN_PROGRESS)
```

`CLOSED` is terminal — no further transitions are permitted. Only users assigned to a ticket may initiate a transition.

### Auditable Event History
Every domain action emits an immutable row to `ticket_events`:

| Event | Trigger |
|---|---|
| `ticket.created` | Ticket creation |
| `ticket.updated` | Title or description edit |
| `ticket.deleted` | Soft deletion |
| `ticket.assigned` | User assigned |
| `ticket.unassigned` | Assignment removed |
| `ticket.status_changed` | Successful transition |
| `ticket.progress_updated` | Progress record saved or updated |
| `ticket.transition_blocked` | Gate check failed |

Each event carries the actor's identity, their role at the time of action, and UTC timestamp. The `ticket_events` table is append-only; a PostgreSQL trigger enforces this at the database level (migration `009`).

### Project Overview and Filtering
- List all tickets in a project with current status and assignees
- Filter by status or by assignee

### Authentication
- JWT-based auth (access token: 30-minute TTL, refresh token: revocable via the `refresh_tokens` table)
- Access tokens are stored in memory only (Zustand) — never in `localStorage` or `sessionStorage`
- Blocked users are denied on login (HTTP 403); existing active sessions continue until token expiry
- Two roles: `administrator` and `user`

---

## Architecture

```
┌─────────────────────┐      REST / JSON      ┌──────────────────────┐
│   React 18 SPA      │ ◄──────────────────► │   FastAPI backend     │
│   (Vite + TS)       │   /api/v1/*           │   (Python 3.11)       │
└─────────────────────┘                       └──────────┬───────────┘
                                                         │ asyncpg / SQLAlchemy 2.0
                                              ┌──────────▼───────────┐
                                              │   PostgreSQL 15       │
                                              └──────────────────────┘
```

**Key design decisions:**

- **Event-driven core** — `ticket_events` is the system of record. All mutations write an event row. The application layer never issues `UPDATE` or `DELETE` against this table.
- **Service layer isolation** — API handlers delegate all business logic to dedicated services (`TicketService`, `WorkflowService`, `TransitionService`, `EventService`, etc.). Handlers only do auth, validation, and response shaping.
- **Progress gate as a domain rule** — `WorkflowService` queries `progress_updates` before every transition. Missing rows block the transition and surface the specific assignees who have not submitted.
- **Row-level locking on transitions** — `TransitionService` issues `SELECT FOR UPDATE` on the ticket and its assignments rows to prevent race conditions when two assignees attempt a concurrent transition.
- **Soft delete** — `tickets.deleted_at` is set rather than hard-deleting rows. All queries filter `WHERE deleted_at IS NULL`. The event history is preserved.
- **UUID primary keys** — all tables use UUID v4 PKs. Sequential IDs are never exposed.
- **Versioned API** — all routes live under `/api/v1/`. Breaking changes require a new version prefix.
- **Append-only enforcement at the DB layer** — migration `009` installs a PostgreSQL trigger that raises an exception if any code attempts `UPDATE` or `DELETE` on `ticket_events`.
- **Admin controls are backend-enforced** — `/api/v1/admin/*` authorization is enforced server-side and not delegated to frontend routing alone.
- **UI preferences are client-scoped** — language and theme settings are persisted per-browser via `localStorage` and are intentionally not synced server-side.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend language | Python 3.11 |
| Web framework | FastAPI 0.111 |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Validation | Pydantic v2 |
| Auth | python-jose (JWT) + bcrypt |
| Logging | structlog (JSON) |
| Database | PostgreSQL 15 |
| Frontend framework | React 18 + TypeScript 5 |
| Build tool | Vite |
| Routing | React Router v6 |
| Data fetching | TanStack Query v5 |
| State | Zustand |
| HTTP client | Axios |
| Backend tests | pytest + pytest-asyncio + httpx |
| Frontend tests | Vitest + React Testing Library |

---

## Prerequisites

| Tool | Minimum Version |
|---|---|
| Python | 3.11 |
| Node.js | 20 LTS |
| PostgreSQL | 15 |
| Docker | 24 (optional — for compose setup) |

---

## Running Locally

### 1. Backend

```bash
cd backend

python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

pip install -e ".[dev]"

cp .env.example .env
```

Edit `.env` — minimum required values:

```dotenv
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/ticket_manager
SECRET_KEY=<random-256-bit-hex>
REFRESH_TOKEN_SECRET=<random-256-bit-hex>
ENVIRONMENT=development
LOG_LEVEL=INFO
FRONTEND_URL=http://localhost:5173
```

Generate secrets:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

> `SECRET_KEY` and `REFRESH_TOKEN_SECRET` must be at least 32 characters. The app refuses to start if either is shorter — this is intentional.

#### Database

```bash
# Option A: local Postgres
createdb ticket_manager

# Option B: Docker
docker run -d --name tms-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ticket_manager \
  -p 5432:5432 postgres:15
```

#### Migrations

```bash
alembic upgrade head
# Applies all migrations through current head (includes `013_add_users_blocked_at`)
```

#### Seed data (optional)

```bash
python scripts/seed_dev.py
# Creates: admin@example.com / admin123 (administrator role)
#          user@example.com  / user123  (user role)
# Creates: 1 project, 3 tickets in various statuses
```

#### Start API

```bash
uvicorn src.main:app --reload --port 8000
```

- `GET http://localhost:8000/health` → `{"status": "ok"}`
- `GET http://localhost:8000/ready` → `{"status": "ready"}`
- `GET http://localhost:8000/docs` → Interactive OpenAPI UI

---

### 2. Frontend

```bash
cd frontend

npm install

cp .env.local.example .env.local
# Set: VITE_API_BASE_URL=http://localhost:8000
```

```bash
npm run dev
# Visit http://localhost:5173
```

---

### 3. Full Stack via Docker Compose

```bash
# From repo root
docker compose up --build
```

Starts three services:
- `postgres` on port 5432
- `backend` on port 8000 (runs `alembic upgrade head` then `uvicorn`)
- `frontend` on port 5173 (nginx serving the built SPA)

---

## Environment Variables

### Backend (`.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | asyncpg connection string |
| `SECRET_KEY` | Yes | JWT signing key — min 32 chars |
| `REFRESH_TOKEN_SECRET` | Yes | Refresh token signing key — min 32 chars |
| `ENVIRONMENT` | Yes | `development` or `production` |
| `LOG_LEVEL` | No | Default: `INFO` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Default: `30` |
| `FRONTEND_URL` | Yes | Used for CORS — must match browser origin exactly |

### Frontend (`.env.local`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | Yes | Backend base URL, e.g. `http://localhost:8000` |

---

## API Overview

All endpoints are under `/api/v1/`.

- Core ticketing contract: `specs/001-ticket-management-system/contracts/openapi.yaml`
- Admin user management contract: `specs/002-ui-personalization-admin/contracts/openapi-admin.yaml`
- Runtime interactive docs: `GET /docs`

| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | Obtain access + refresh tokens |
| POST | `/auth/refresh` | Exchange refresh token for new access token |
| POST | `/auth/logout` | Revoke refresh token |
| GET | `/projects` | List projects |
| GET | `/projects/{id}/tickets` | List tickets (filter by status, assignee) |
| POST | `/projects/{id}/tickets` | Create a primary ticket |
| GET | `/tickets/{id}` | Get ticket detail |
| PATCH | `/tickets/{id}` | Edit ticket title/description |
| DELETE | `/tickets/{id}` | Soft-delete ticket |
| POST | `/tickets/{id}/assignments` | Assign a user |
| DELETE | `/tickets/{id}/assignments/{user_id}` | Remove an assignment |
| PUT | `/tickets/{id}/progress` | Submit or update your progress update |
| GET | `/tickets/{id}/progress` | List all assignees' progress updates |
| POST | `/tickets/{id}/transitions` | Attempt a status transition |
| GET | `/tickets/{id}/events` | Paginated activity history |
| GET | `/admin/users` | List all users (admin only) |
| POST | `/admin/users` | Create a user (admin only) |
| PATCH | `/admin/users/{id}` | Edit a user (admin only) |
| POST | `/admin/users/{id}/block` | Block a user (admin only; self-block forbidden) |
| POST | `/admin/users/{id}/unblock` | Unblock a user (admin only) |

---

## Running Tests

### Backend

```bash
cd backend

pytest                        # all tests
pytest tests/unit/            # pure unit tests (no DB)
pytest tests/integration/     # requires live PostgreSQL
pytest tests/contract/        # validates responses against openapi.yaml
pytest tests/integration/test_auth_blocked.py   # blocked-user login flow
pytest tests/contract/test_admin.py             # admin API contract coverage
```

### Frontend

```bash
cd frontend

npm test                      # Vitest single-run
npm run test:watch            # Vitest watch mode
npm run test:coverage         # with coverage report
npm run typecheck             # TypeScript type check only
npm run test -- LanguageSwitcher
npm run test -- ThemeSwitcher
npm run test -- AdminUsersPage
npm run test -- ProjectPage.url
```

---

## Assumptions and Scope Decisions

1. **Ticket statuses are hard-coded.** `OPEN → IN_PROGRESS → IN_REVIEW → DONE → CLOSED`. Workflow configurability is a future concern.

2. **No project-level access control.** All authenticated users can read and act on all projects and tickets. This is an explicit scope decision for a small internal team tool. If the system ever becomes multi-tenant, per-project membership controls become a blocker.

3. **"Product owner" is not a system role.** The system has two roles: `administrator` and `user`. Any authenticated user may create primary or follow-up tickets.

4. **Progress update is one updateable record per (ticket, assignee).** Each new submission replaces the previous content, but every submission is recorded as a `ticket.progress_updated` event, so the full history is traceable.

5. **Assignee removal does not delete progress records.** Removed assignees' progress records remain in the history. Assignment removal itself is recorded as a `ticket.unassigned` event.

6. **Ticket deletion is soft.** `deleted_at` is set; the ticket and its events are never removed from the database. This preserves the audit trail.

7. **No external message broker.** Events are written synchronously within the same database transaction as the triggering action. This is appropriate for the expected scale (10–200 concurrent users).

8. **JWT access tokens are not revocable.** After logout, the refresh token is revoked, but an intercepted access token remains valid for up to 30 minutes (standard JWT tradeoff). The short TTL and memory-only client storage mitigate this.

9. **No rate limiting in the application layer.** Rate limiting on `/auth/login` is expected to be handled by the reverse proxy in production.

10. **User deactivation is block/unblock only.** Admins cannot delete users; account data is retained for auditability.

11. **Block enforcement timing is next login.** Blocking does not terminate an already-issued access token; active sessions expire naturally.

12. **Theme catalog is fixed at six schemes.** `light`, `dark`, `solarized`, `oceanic`, `high-contrast`, and `warm` are the supported set for this feature scope.

---

## Security Notes

- Passwords are hashed with bcrypt. Plaintext passwords are never stored or logged.
- JWT access tokens are stored in memory only (Zustand) — not in `localStorage` or `sessionStorage`.
- Refresh tokens are stored server-side as SHA-256 hashes, supporting revocation.
- `ticket_events` is enforced append-only by both the application layer and a PostgreSQL trigger (migration `009`). No `UPDATE` or `DELETE` is ever issued against this table.
- CORS is restricted to `FRONTEND_URL` only. `allow_origins=["*"]` is not used.
- Role-based and assignment-based access control is enforced in FastAPI dependency functions before any handler executes.
- Admin actions are restricted to `administrator` role server-side for all `/api/v1/admin/*` endpoints.
- Admin user-management actions are auditable via structured logs including actor and target IDs.
- Self-targeted admin safety checks prevent own-account block actions.
- Structured JSON logs (structlog) exclude sensitive fields. Stack traces are suppressed in `production` mode.

See `devops/security-review.md` for the full threat model, finding catalog, and accepted residual risks.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `ValidationError: secret_key` at startup | `SECRET_KEY` shorter than 32 chars | Generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `connection refused` on port 5432 | Postgres not running | Start Postgres or Docker container |
| `alembic: command not found` | venv not activated | `source .venv/bin/activate` |
| `401 Unauthorized` on all endpoints | Access token expired (30-min TTL) | Re-login to get a fresh token |
| `403 Your account has been blocked` at login | User account has `blocked_at` set | Ask an administrator to unblock the account |
| Transition returns 422 with `missing_updates` | Not all assignees have submitted progress | Each assignee must `PUT /api/v1/tickets/{id}/progress` before transitioning |
| CORS errors in browser | `FRONTEND_URL` mismatch | Ensure `FRONTEND_URL` in backend `.env` matches the browser origin exactly |
| Alembic is behind latest head revision | Not all migrations are applied (for example `013_add_users_blocked_at`) | Run `alembic upgrade head` and verify the reported current revision |

---

## Project Layout

```
ticket-manager/
├── backend/
│   ├── alembic/versions/       # numbered migrations (current head includes 013)
│   ├── src/
│   │   ├── main.py
│   │   ├── core/               # config, database, security, logging
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── services/           # business logic (ticket, workflow, transition, event…)
│   │   └── api/v1/             # FastAPI route handlers
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── contract/
│   └── scripts/seed_dev.py
├── frontend/
│   ├── src/
│   │   ├── api/                # typed API client functions
│   │   ├── locales/            # i18n dictionaries (en/ru/es)
│   │   ├── components/         # React components
│   │   │   ├── admin/          # admin user-management UI
│   │   │   └── common/         # language/theme switchers
│   │   ├── hooks/              # custom hooks (including useTheme)
│   │   ├── pages/              # route-level page components
│   │   └── store/auth.ts       # Zustand auth state (memory-only tokens)
│   └── tests/
├── devops/
│   ├── runbook.md              # operational runbook
│   └── security-review.md     # threat model and findings
├── specs/001-ticket-management-system/
│   ├── spec.md                 # feature specification
│   ├── plan.md                 # implementation plan and constitution check
│   ├── data-model.md           # entity definitions and relationships
│   ├── quickstart.md           # detailed developer quickstart
│   └── contracts/openapi.yaml  # full API contract
├── specs/002-ui-personalization-admin/
│   ├── spec.md                 # UI personalization and admin management spec
│   ├── plan.md                 # implementation plan
│   ├── quickstart.md           # end-to-end test scenarios
│   └── contracts/openapi-admin.yaml
└── docker-compose.yml
```
