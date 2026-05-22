import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProjectTicketList } from "../../src/components/projects/ProjectTicketList";
import * as projectsApi from "../../src/api/projects";
import type { TicketListResponse } from "../../src/types";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const tickets: TicketListResponse = {
  total: 2,
  items: [
    {
      id: "t1",
      project_id: "p1",
      parent_ticket_id: null,
      title: "First ticket",
      description: null,
      status: "OPEN",
      created_by: { id: "u1", email: "admin@example.com", role: "administrator" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assignees: [],
      follow_up_count: 0,
    },
    {
      id: "t2",
      project_id: "p1",
      parent_ticket_id: null,
      title: "Second ticket",
      description: null,
      status: "IN_PROGRESS",
      created_by: { id: "u1", email: "admin@example.com", role: "administrator" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assignees: [],
      follow_up_count: 0,
    },
  ],
};

describe("ProjectTicketList", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders correct ticket count", async () => {
    vi.spyOn(projectsApi, "listTickets").mockResolvedValue(tickets);
    render(<ProjectTicketList projectId="p1" />, { wrapper });
    await waitFor(() => expect(screen.getByText("First ticket")).toBeInTheDocument());
    expect(screen.getByText("Second ticket")).toBeInTheDocument();
  });

  it("shows empty state when no tickets match", async () => {
    vi.spyOn(projectsApi, "listTickets").mockResolvedValue({ total: 0, items: [] });
    render(<ProjectTicketList projectId="p1" />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText(/no tickets match/i)).toBeInTheDocument()
    );
  });
});
