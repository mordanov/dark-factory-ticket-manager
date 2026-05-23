from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from src.models.ticket import TicketSpec, TicketStatus, TicketType
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


class TagResponse(BaseModel):
    id: UUID
    name: str

    model_config = {"from_attributes": True}


class TicketCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    ticket_type: TicketType = TicketType.FEATURE
    ticket_spec: TicketSpec
    urgent: bool = False
    blocker: bool = False
    bugfix: bool = False
    tags: list[Annotated[str, Field(min_length=1, max_length=50)]] = Field(default_factory=list)

    @field_validator("tags")
    @classmethod
    def validate_tags_count(cls, v: list[str]) -> list[str]:
        if len(v) > 10:
            raise ValueError("Maximum 10 tags per ticket")
        return v


class FollowUpTicketCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    ticket_type: TicketType = TicketType.FEATURE
    ticket_spec: TicketSpec
    urgent: bool = False
    blocker: bool = False
    bugfix: bool = False
    tags: list[Annotated[str, Field(min_length=1, max_length=50)]] = Field(default_factory=list)

    @field_validator("tags")
    @classmethod
    def validate_tags_count(cls, v: list[str]) -> list[str]:
        if len(v) > 10:
            raise ValueError("Maximum 10 tags per ticket")
        return v


class TicketUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    ticket_type: TicketType | None = None
    ticket_spec: TicketSpec | None = None
    urgent: bool | None = None
    blocker: bool | None = None
    bugfix: bool | None = None


class TicketResponse(BaseModel):
    id: UUID
    display_id: str | None = None
    number: int | None = None
    project_id: UUID
    parent_ticket_id: UUID | None = None
    title: str
    description: str | None = None
    status: TicketStatus
    ticket_type: TicketType = TicketType.FEATURE
    ticket_spec: TicketSpec | None = None
    urgent: bool = False
    blocker: bool = False
    bugfix: bool = False
    created_by: UserSummary
    created_at: datetime
    updated_at: datetime
    assignees: list[AssigneeSummary] = []
    follow_up_count: int = 0
    tags: list[TagResponse] = []

    model_config = {"from_attributes": True}


class TicketListResponse(BaseModel):
    items: list[TicketResponse]
    total: int


class TagAddRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)
