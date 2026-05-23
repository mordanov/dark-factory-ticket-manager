import enum
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Column, Enum, ForeignKey, Index, Integer, String, Table, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base

ticket_tags_table = Table(
    "ticket_tags",
    Base.metadata,
    Column("ticket_id", ForeignKey("tickets.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class TicketStatus(enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    IN_REVIEW = "IN_REVIEW"
    DONE = "DONE"
    CLOSED = "CLOSED"


class TicketType(enum.Enum):
    BUG = "bug"
    FEATURE = "feature"
    IMPROVEMENT = "improvement"
    INVESTIGATION = "investigation"
    DISCOVERY = "discovery"
    REPORTING = "reporting"
    TESTING = "testing"
    ANALYSIS = "analysis"
    OTHER = "other"


class TicketSpec(enum.Enum):
    BACKEND = "backend"
    FRONTEND = "frontend"
    ARCHITECTURE = "architecture"
    TESTING = "testing"
    BUSINESS_ANALYSIS = "business_analysis"
    PRODUCT_MANAGEMENT = "product_management"
    OTHER = "other"


class Ticket(Base):
    __tablename__ = "tickets"
    __table_args__ = (
        Index("idx_tickets_project_id", "project_id"),
        Index("idx_tickets_parent_ticket_id", "parent_ticket_id"),
        Index("idx_tickets_status", "status"),
        Index("idx_tickets_created_by", "created_by"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"), nullable=False)
    parent_ticket_id: Mapped[UUID | None] = mapped_column(ForeignKey("tickets.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TicketStatus] = mapped_column(
        Enum(TicketStatus, name="ticket_status", create_type=False),
        nullable=False,
        default=TicketStatus.OPEN,
    )
    number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ticket_type: Mapped[TicketType] = mapped_column(
        Enum(TicketType, name="ticket_type", create_type=False),
        nullable=False,
        default=TicketType.FEATURE,
    )
    ticket_spec: Mapped[TicketSpec | None] = mapped_column(
        Enum(TicketSpec, name="ticket_spec", create_type=False),
        nullable=True,
    )
    urgent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    blocker: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    bugfix: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(nullable=True)

    project = relationship("Project", back_populates="tickets")
    creator = relationship("User", back_populates="tickets_created", foreign_keys=[created_by])
    parent = relationship("Ticket", remote_side="Ticket.id", foreign_keys=[parent_ticket_id])
    follow_ups = relationship("Ticket", foreign_keys=[parent_ticket_id], back_populates="parent")
    assignments = relationship("TicketAssignment", back_populates="ticket", cascade="all, delete-orphan")
    progress_updates = relationship("ProgressUpdate", back_populates="ticket")
    events = relationship("TicketEvent", back_populates="ticket", order_by="TicketEvent.occurred_at")
    tags = relationship("Tag", secondary=ticket_tags_table, back_populates="tickets")
