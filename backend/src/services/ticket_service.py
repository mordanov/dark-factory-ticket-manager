from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.ticket import Ticket, TicketStatus
from src.models.ticket_assignment import TicketAssignment
from src.models.user import User
from src.schemas.ticket import AssigneeSummary, TicketCreate, TicketResponse, TicketUpdate
from src.services.event_service import emit_event


async def _load_ticket_response(session: AsyncSession, ticket: Ticket) -> TicketResponse:
    stmt = (
        select(Ticket)
        .where(Ticket.id == ticket.id)
        .options(
            selectinload(Ticket.creator),
            selectinload(Ticket.assignments).selectinload(TicketAssignment.user),
            selectinload(Ticket.progress_updates),
        )
    )
    result = await session.execute(stmt)
    t = result.scalar_one()

    progress_user_ids = {pu.user_id for pu in t.progress_updates}
    assignees = [
        AssigneeSummary(
            user_id=a.user_id,
            email=a.user.email,
            has_progress_update=a.user_id in progress_user_ids,
        )
        for a in t.assignments
    ]

    follow_up_count_result = await session.execute(
        select(func.count()).where(
            Ticket.parent_ticket_id == ticket.id,
            Ticket.deleted_at.is_(None),
        )
    )
    follow_up_count = follow_up_count_result.scalar() or 0

    return TicketResponse(
        id=t.id,
        project_id=t.project_id,
        parent_ticket_id=t.parent_ticket_id,
        title=t.title,
        description=t.description,
        status=t.status,
        created_by=t.creator,  # type: ignore[arg-type]
        created_at=t.created_at,
        updated_at=t.updated_at,
        assignees=assignees,
        follow_up_count=follow_up_count,
    )


async def create_ticket(
    session: AsyncSession,
    project_id: UUID,
    data: TicketCreate,
    actor: User,
) -> TicketResponse:
    from src.models.project import Project

    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    ticket = Ticket(
        project_id=project_id,
        title=data.title,
        description=data.description,
        created_by=actor.id,
        status=TicketStatus.OPEN,
    )
    session.add(ticket)
    await session.flush()

    await emit_event(
        session,
        ticket.id,
        "ticket.created",
        actor,
        prev_state=None,
        new_state={"title": ticket.title, "status": ticket.status.value, "project_id": str(ticket.project_id)},
    )
    await session.commit()
    return await _load_ticket_response(session, ticket)


async def create_follow_up(
    session: AsyncSession,
    parent_ticket_id: UUID,
    data: TicketCreate,
    actor: User,
) -> TicketResponse:
    parent = await session.get(Ticket, parent_ticket_id)
    if parent is None or parent.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent ticket not found")

    ticket = Ticket(
        project_id=parent.project_id,
        parent_ticket_id=parent_ticket_id,
        title=data.title,
        description=data.description,
        created_by=actor.id,
        status=TicketStatus.OPEN,
    )
    session.add(ticket)
    await session.flush()

    await emit_event(
        session,
        ticket.id,
        "ticket.created",
        actor,
        prev_state=None,
        new_state={"title": ticket.title, "status": ticket.status.value, "project_id": str(ticket.project_id)},
    )
    await session.commit()
    return await _load_ticket_response(session, ticket)


async def update_ticket(
    session: AsyncSession,
    ticket_id: UUID,
    data: TicketUpdate,
    actor: User,
) -> TicketResponse:
    ticket = await session.get(Ticket, ticket_id)
    if ticket is None or ticket.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if ticket.created_by != actor.id and actor.role.value != "administrator":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the ticket creator")

    prev_state = {"title": ticket.title, "description": ticket.description}
    if data.title is not None:
        ticket.title = data.title
    if data.description is not None:
        ticket.description = data.description

    await emit_event(
        session,
        ticket.id,
        "ticket.updated",
        actor,
        prev_state=prev_state,
        new_state={"title": ticket.title, "description": ticket.description},
    )
    await session.commit()
    return await _load_ticket_response(session, ticket)


async def delete_ticket(
    session: AsyncSession,
    ticket_id: UUID,
    actor: User,
) -> None:
    from datetime import UTC, datetime

    ticket = await session.get(Ticket, ticket_id)
    if ticket is None or ticket.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if ticket.created_by != actor.id and actor.role.value != "administrator":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the ticket creator")

    follow_up_count_result = await session.execute(
        select(func.count()).where(
            Ticket.parent_ticket_id == ticket_id,
            Ticket.deleted_at.is_(None),
        )
    )
    if (follow_up_count_result.scalar() or 0) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete ticket with active follow-up tickets",
        )

    prev_state = {"title": ticket.title, "status": ticket.status.value}
    ticket.deleted_at = datetime.now(UTC)

    await emit_event(
        session,
        ticket.id,
        "ticket.deleted",
        actor,
        prev_state=prev_state,
        new_state=None,
    )
    await session.commit()


async def get_ticket(session: AsyncSession, ticket_id: UUID) -> TicketResponse:
    ticket = await session.get(Ticket, ticket_id)
    if ticket is None or ticket.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return await _load_ticket_response(session, ticket)


async def list_tickets(
    session: AsyncSession,
    project_id: UUID,
    status_filter: TicketStatus | None = None,
    assignee_id: UUID | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[TicketResponse], int]:
    from src.models.project import Project

    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    base_stmt = select(Ticket).where(
        Ticket.project_id == project_id,
        Ticket.deleted_at.is_(None),
    )
    if status_filter is not None:
        base_stmt = base_stmt.where(Ticket.status == status_filter)
    if assignee_id is not None:
        base_stmt = base_stmt.where(
            Ticket.id.in_(
                select(TicketAssignment.ticket_id).where(TicketAssignment.user_id == assignee_id)
            )
        )

    count_result = await session.execute(select(func.count()).select_from(base_stmt.subquery()))
    total = count_result.scalar() or 0

    paginated = base_stmt.offset((page - 1) * page_size).limit(page_size)
    tickets_result = await session.execute(paginated)
    tickets = tickets_result.scalars().all()

    responses = [await _load_ticket_response(session, t) for t in tickets]
    return responses, total
