from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from src.models.ticket import TicketStatus
from src.models.user import UserRole


class UserSummary(BaseModel):
    id: UUID
    email: str
    role: UserRole

    model_config = {"from_attributes": True}


class AssigneeSummary(BaseModel):
    user_id: UUID
    email: str
    has_progress_update: bool


class TicketCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None


class FollowUpTicketCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None


class TicketUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None


class TicketResponse(BaseModel):
    id: UUID
    project_id: UUID
    parent_ticket_id: UUID | None = None
    title: str
    description: str | None = None
    status: TicketStatus
    created_by: UserSummary
    created_at: datetime
    updated_at: datetime
    assignees: list[AssigneeSummary] = []
    follow_up_count: int = 0

    model_config = {"from_attributes": True}


class TicketListResponse(BaseModel):
    items: list[TicketResponse]
    total: int
