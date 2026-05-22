from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_user
from src.models.project import Project
from src.models.ticket import TicketStatus
from src.models.user import User
from src.schemas.ticket import TicketCreate, TicketListResponse, TicketResponse
from src.services import ticket_service

router = APIRouter(tags=["Projects"])


@router.get("/projects", status_code=200)
async def list_projects(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    result = await db.execute(select(Project))
    projects = result.scalars().all()
    return {
        "items": [
            {"id": str(p.id), "name": p.name, "slug": p.slug}
            for p in projects
        ]
    }


@router.get("/projects/{project_id}/tickets", response_model=TicketListResponse)
async def list_tickets(
    project_id: UUID,
    status: TicketStatus | None = Query(default=None),
    assignee_id: UUID | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> TicketListResponse:
    items, total = await ticket_service.list_tickets(
        db, project_id, status, assignee_id, page, page_size
    )
    return TicketListResponse(items=items, total=total)


@router.post("/projects/{project_id}/tickets", response_model=TicketResponse, status_code=201)
async def create_ticket(
    project_id: UUID,
    body: TicketCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TicketResponse:
    return await ticket_service.create_ticket(db, project_id, body, current_user)
