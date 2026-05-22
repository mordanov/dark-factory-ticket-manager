import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TicketCard } from "../../src/components/tickets/TicketCard";
import type { TicketResponse } from "../../src/types";

const base: TicketResponse = {
  id: "t1",
  project_id: "p1",
  parent_ticket_id: null,
  title: "Fix login bug",
  description: null,
  status: "OPEN",
  created_by: { id: "u1", email: "admin@example.com", role: "administrator" },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  assignees: [],
  follow_up_count: 0,
};

function renderCard(ticket: Partial<TicketResponse> = {}) {
  return render(
    <MemoryRouter>
      <TicketCard ticket={{ ...base, ...ticket }} />
    </MemoryRouter>
  );
}

describe("TicketCard", () => {
  it("renders ticket title as a link", () => {
    renderCard();
    expect(screen.getByRole("link", { name: "Fix login bug" })).toHaveAttribute("href", "/tickets/t1");
  });

  it("shows status badge", () => {
    renderCard({ status: "IN_PROGRESS" });
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("shows assignee emails", () => {
    renderCard({
      assignees: [{ user_id: "u2", email: "alice@example.com", has_progress_update: false }],
    });
    expect(screen.getByText(/alice@example\.com/)).toBeInTheDocument();
  });

  it("shows follow-up count when > 0", () => {
    renderCard({ follow_up_count: 3 });
    expect(screen.getByText(/3 follow-ups/)).toBeInTheDocument();
  });

  it("shows parent ticket link when parent_ticket_id present", () => {
    renderCard({ parent_ticket_id: "parent123" });
    expect(screen.getByRole("link", { name: "parent ticket" })).toHaveAttribute("href", "/tickets/parent123");
  });
});
