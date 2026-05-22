# Test Strategy: Ticket Management System

**Branch**: `001-ticket-management-system` | **Date**: 2026-05-23  
**Agent**: autotester  
**Input**: spec.md, plan.md, data-model.md, contracts/openapi.yaml, tasks.md

---

## Scope

All five user stories (US1–US5) plus cross-cutting concerns: authentication, event
integrity, workflow enforcement, RBAC, and performance smoke checks.

---

## Test Levels and Tools

| Level | Tool | Location |
|-------|------|----------|
| Backend unit | pytest | `backend/tests/unit/` |
| Backend integration | pytest + asyncpg (real DB) | `backend/tests/integration/` |
| Backend contract | pytest + httpx TestClient | `backend/tests/contract/` |
| Frontend component | Vitest + React Testing Library | `frontend/tests/components/` |
| Frontend page | Vitest + React Testing Library | `frontend/tests/pages/` |

**No mocks for DB in integration tests** — integration tests hit a real PostgreSQL
instance (matching plan.md architecture).

---

## Test Data Strategy

- UUID fixtures generated deterministically per test (not random) to ease debugging.
- Seed helpers: `create_user(role)`, `create_project()`, `create_ticket(project, creator)`,
  `assign_user(ticket, user)`, `submit_progress(ticket, user, content)`.
- Database reset between integration tests via transaction rollback or truncation.
- No production data. No sensitive data in fixtures.

---

## Task Coverage Map

### T041 — Contract Tests: Ticket CRUD (US1)
**File**: `backend/tests/contract/test_tickets.py`  
**Depends on**: T031–T037 (backend US1 implementation)

Scenarios:
- `POST /api/v1/projects/{id}/tickets` → 201 Created, status=OPEN, creator recorded
- `GET /api/v1/tickets/{id}` → 200 with full ticket shape
- `PATCH /api/v1/tickets/{id}` → 200 updated fields, 403 if non-creator non-admin
- `DELETE /api/v1/tickets/{id}` (no follow-ups) → 204, soft-delete
- `DELETE /api/v1/tickets/{id}` (has follow-ups) → 409 with explanation
- `GET /api/v1/tickets/{id}` (deleted) → 404
- `POST /api/v1/tickets/{id}/follow-ups` → 201, parent_ticket_id set correctly
- Unauthenticated request → 401

### T042 — Integration Tests: TicketService (US1)
**File**: `backend/tests/integration/test_ticket_service.py`  
**Depends on**: T032–T035, T020 (event_service)

Scenarios:
- `create_ticket()` emits `ticket.created` event with correct actor + prev_state=null
- `create_follow_up()` rejects deleted parent (404)
- `delete_ticket()` blocked by active follow-ups (409), emits no event
- `delete_ticket()` emits `ticket.deleted` event on success
- `update_ticket()` emits `ticket.updated` event with correct prev/new state snapshot
- `update_ticket()` 403 when caller is not creator and not admin

### T052 — Contract Tests: Assignments (US2)
**File**: `backend/tests/contract/test_assignments.py`  
**Depends on**: T043–T049

Scenarios:
- `POST /api/v1/tickets/{id}/assignments` → 201, assignee appears on ticket
- Duplicate assign → 409
- `DELETE /api/v1/tickets/{id}/assignments/{user_id}` → 204
- Unassign preserves `progress_updates` record (verify via GET progress)
- `PUT /api/v1/tickets/{id}/progress` → 200 upsert (first submit and re-submit)
- `GET /api/v1/tickets/{id}/progress` → lists all assignees (including unassigned with records)
- Non-assignee submitting progress → 403

### T053 — Integration Tests: ProgressService (US2)
**File**: `backend/tests/integration/test_progress_service.py`  
**Depends on**: T047, T046, T020

Scenarios:
- First `submit_update()` emits `ticket.progress_updated` with `prev_content=null`
- Re-submit emits `ticket.progress_updated` with correct `prev_content`
- `unassign_user()` leaves `progress_updates` row intact
- Non-assignee calling `submit_update()` raises 403

### T059 — Contract Tests: Status Transitions (US3)
**File**: `backend/tests/contract/test_transitions.py`  
**Depends on**: T054–T056

Scenarios:
- Valid transition (all progress submitted) → 200 with updated TicketResponse
- Missing progress (1 of 2 assignees) → 422 with `missing_updates` listing correct user IDs
- Invalid workflow path (e.g., OPEN→DONE) → 409
- Non-assignee caller → 403
- Unauthenticated → 401
- CLOSED ticket transition attempt → 409 (terminal state)

### T060 — Integration Tests: WorkflowService (US3)
**File**: `backend/tests/integration/test_workflow_service.py`  
**Depends on**: T054, T020

Scenarios:
- Successful `transition()` emits `ticket.status_changed` with prev/new state
- Blocked `transition()` emits `ticket.transition_blocked` and rolls back (no status change)
- `CLOSED` is terminal — any transition from CLOSED raises 409
- Transaction atomicity: if event emission fails, status is not updated
- Concurrent assignee removal does not bypass progress gate (race condition check)

### T067 — Contract Tests: Event History (US4)
**File**: `backend/tests/contract/test_events.py`  
**Depends on**: T062–T064

Scenarios:
- `GET /api/v1/tickets/{id}/events` returns chronological list (ASC occurred_at)
- All 8 event types appear in response when triggered:
  `ticket.created`, `ticket.updated`, `ticket.deleted`, `ticket.assigned`,
  `ticket.unassigned`, `ticket.progress_updated`, `ticket.status_changed`,
  `ticket.transition_blocked`
- Each event has actor `{id, email, role}` and `occurred_at`
- Pagination: `page=1&page_size=2` returns 2 events, `total` reflects full count
- Unauthenticated → 401

### T073 — Frontend Component Tests: FilterBar + ProjectTicketList (US5)
**File**: `frontend/tests/components/`  
**Depends on**: T070–T072

Scenarios:
- `FilterBar` — status dropdown emits onChange with selected status value
- `FilterBar` — "All" option emits onChange with null/undefined
- `FilterBar` — assignee dropdown emits onChange with selected user ID
- `ProjectTicketList` — renders correct ticket count from mock data
- `ProjectTicketList` — empty state shown when filtered results are empty
- `ProjectTicketList` — each TicketCard links to correct ticket detail URL

### T074 — Frontend Component Tests: TicketForm, TicketCard, StatusTransitionButton
**File**: `frontend/tests/components/`  
**Depends on**: T038, T040, T057

Scenarios:
- `TicketForm` — submits with valid title, blocks submit on empty title
- `TicketForm` — shows validation error on empty title
- `TicketCard` — renders title, status badge, assignee names, follow-up count
- `StatusTransitionButton` — shows available next statuses for current status
- `StatusTransitionButton` — blocked state (422) renders missing-update user list
- `StatusTransitionButton` — invalid transition (409) shows "Invalid transition" message

### T075 — Frontend Page Tests: LoginPage + TicketDetailPage
**File**: `frontend/tests/pages/`  
**Depends on**: T026, T066

Scenarios:
- `LoginPage` — submits email/password, on success redirects to project list
- `LoginPage` — shows API error message on failed login (401)
- `LoginPage` — disables submit on empty fields
- `TicketDetailPage` — loading state shown while fetching
- `TicketDetailPage` — error state shown on network failure
- `TicketDetailPage` — success state renders TicketCard, AssigneeProgressList,
  StatusTransitionButton, TicketEventHistory

### T080 — QA Acceptance Criteria Verification Report
**File**: `devops/qa-report.md`  
**Depends on**: All implementation + T041–T075

Format: Quality Report template from autotester.md. Maps each acceptance scenario
from spec.md (US1–US5) to a passing test or explicit gap note. Includes release
recommendation: GO / NO-GO / GO WITH RISKS.

---

## Critical Risk Areas

### Auth (T014, T018, T022, T024)
- Token stored in memory only (NOT localStorage) — verified in T075 (LoginPage test)
- Refresh token revocation — verified in T059 indirectly
- bcrypt cost factor — noted in T029 (security gate)

### Event Integrity (T020, T064)
- No UPDATE/DELETE on `ticket_events` — verified in T042, T053, T060
- All 8 event types emitted — verified in T067

### Workflow Gate (T054)
- Progress gate cannot be bypassed — T059 + T060
- Race condition (concurrent unassign) — T060

### RBAC
- Non-assignee cannot transition — T059
- Non-creator cannot edit/delete — T041
- Unauthenticated blocked everywhere — T041, T059, T067

---

## CI Integration Recommendations

| Suite | When to run | Max duration |
|-------|-------------|--------------|
| Unit + contract tests | Every commit / PR | < 2 min |
| Integration tests | Every PR (real DB in CI) | < 5 min |
| Frontend tests | Every commit / PR | < 2 min |
| Full regression | Pre-merge to main | < 10 min |

---

## Blocking Quality Gates

**Block release when**:
- Any contract or integration test fails
- Event integrity tests fail
- Security acceptance criteria (T029, T061, T081) not APPROVED
- T080 QA report recommendation is NO-GO

**Track but do not block**:
- T074–T075 frontend tests with cosmetic gaps
- Performance targets not verified (no load test in v1 scope)
