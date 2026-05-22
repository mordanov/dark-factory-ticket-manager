from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import create_access_token, hash_password
from src.models.project import Project
from src.models.ticket import Ticket, TicketStatus
from src.models.user import User, UserRole


async def _create_user(session: AsyncSession, email: str, role: UserRole = UserRole.user) -> User:
    user = User(email=email, hashed_password=hash_password("password"), role=role)
    session.add(user)
    await session.flush()
    return user


async def _create_project(session: AsyncSession, creator: User) -> Project:
    project = Project(name="Test Project", slug=f"test-{uuid4()}", created_by=creator.id)
    session.add(project)
    await session.flush()
    return project


def _auth_headers(user: User) -> dict:
    token = create_access_token(str(user.id), user.role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_ticket_201(client: AsyncClient, db_session: AsyncSession):
    user = await _create_user(db_session, f"u-{uuid4()}@test.com")
    project = await _create_project(db_session, user)
    await db_session.commit()

    resp = await client.post(
        f"/api/v1/projects/{project.id}/tickets",
        json={"title": "Test ticket"},
        headers=_auth_headers(user),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Test ticket"
    assert data["status"] == "OPEN"


@pytest.mark.asyncio
async def test_get_ticket_200(client: AsyncClient, db_session: AsyncSession):
    user = await _create_user(db_session, f"u-{uuid4()}@test.com")
    project = await _create_project(db_session, user)
    ticket = Ticket(
        project_id=project.id,
        title="Get me",
        created_by=user.id,
        status=TicketStatus.OPEN,
    )
    db_session.add(ticket)
    await db_session.commit()

    resp = await client.get(f"/api/v1/tickets/{ticket.id}", headers=_auth_headers(user))
    assert resp.status_code == 200
    assert resp.json()["id"] == str(ticket.id)


@pytest.mark.asyncio
async def test_update_ticket_200(client: AsyncClient, db_session: AsyncSession):
    user = await _create_user(db_session, f"u-{uuid4()}@test.com")
    project = await _create_project(db_session, user)
    ticket = Ticket(project_id=project.id, title="Old", created_by=user.id, status=TicketStatus.OPEN)
    db_session.add(ticket)
    await db_session.commit()

    resp = await client.patch(
        f"/api/v1/tickets/{ticket.id}",
        json={"title": "New title"},
        headers=_auth_headers(user),
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "New title"


@pytest.mark.asyncio
async def test_delete_ticket_204(client: AsyncClient, db_session: AsyncSession):
    user = await _create_user(db_session, f"u-{uuid4()}@test.com")
    project = await _create_project(db_session, user)
    ticket = Ticket(project_id=project.id, title="Delete me", created_by=user.id, status=TicketStatus.OPEN)
    db_session.add(ticket)
    await db_session.commit()

    resp = await client.delete(f"/api/v1/tickets/{ticket.id}", headers=_auth_headers(user))
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_delete_ticket_409_with_follow_ups(client: AsyncClient, db_session: AsyncSession):
    user = await _create_user(db_session, f"u-{uuid4()}@test.com")
    project = await _create_project(db_session, user)
    parent = Ticket(project_id=project.id, title="Parent", created_by=user.id, status=TicketStatus.OPEN)
    db_session.add(parent)
    await db_session.flush()
    child = Ticket(
        project_id=project.id,
        parent_ticket_id=parent.id,
        title="Child",
        created_by=user.id,
        status=TicketStatus.OPEN,
    )
    db_session.add(child)
    await db_session.commit()

    resp = await client.delete(f"/api/v1/tickets/{parent.id}", headers=_auth_headers(user))
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_get_deleted_ticket_404(client: AsyncClient, db_session: AsyncSession):
    from datetime import UTC, datetime

    user = await _create_user(db_session, f"u-{uuid4()}@test.com")
    project = await _create_project(db_session, user)
    ticket = Ticket(
        project_id=project.id,
        title="Gone",
        created_by=user.id,
        status=TicketStatus.OPEN,
        deleted_at=datetime.now(UTC),
    )
    db_session.add(ticket)
    await db_session.commit()

    resp = await client.get(f"/api/v1/tickets/{ticket.id}", headers=_auth_headers(user))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_ticket_403_non_creator(client: AsyncClient, db_session: AsyncSession):
    creator = await _create_user(db_session, f"creator-{uuid4()}@test.com")
    other = await _create_user(db_session, f"other-{uuid4()}@test.com")
    project = await _create_project(db_session, creator)
    ticket = Ticket(project_id=project.id, title="Mine", created_by=creator.id, status=TicketStatus.OPEN)
    db_session.add(ticket)
    await db_session.commit()

    resp = await client.patch(
        f"/api/v1/tickets/{ticket.id}",
        json={"title": "Steal"},
        headers=_auth_headers(other),
    )
    assert resp.status_code == 403
