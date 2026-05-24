import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "../../src/components/common/FilterBar";
import type { FilterState } from "../../src/components/common/FilterBar";
import type { AssigneeSummary } from "../../src/types";

const noop = () => {};
const emptyFilters: FilterState = { status: "", assigneeId: "" };

const assignees: AssigneeSummary[] = [
  { user_id: "u1", email: "alice@example.com", has_progress_update: true },
  { user_id: "u2", email: "bob@example.com", has_progress_update: false },
];

describe("FilterBar", () => {
  it("renders status select with all statuses", () => {
    render(<FilterBar filters={emptyFilters} assignees={[]} onChange={noop} />);
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "All statuses" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "In Progress" })).toBeInTheDocument();
  });

  it("does not render assignee filter when assignees is empty", () => {
    render(<FilterBar filters={emptyFilters} assignees={[]} onChange={noop} />);
    expect(screen.queryByLabelText("Assignee")).not.toBeInTheDocument();
  });

  it("renders assignee filter when assignees provided", () => {
    render(<FilterBar filters={emptyFilters} assignees={assignees} onChange={noop} />);
    expect(screen.getByLabelText("Assignee")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "alice@example.com" })).toBeInTheDocument();
  });

  it("calls onChange with correct status when changed", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FilterBar filters={emptyFilters} assignees={[]} onChange={onChange} />);
    await user.selectOptions(screen.getByLabelText("Status"), "IN_PROGRESS");
    expect(onChange).toHaveBeenCalledWith({ status: "IN_PROGRESS", assigneeId: "" });
  });

  it("calls onChange with correct assigneeId when changed", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FilterBar filters={emptyFilters} assignees={assignees} onChange={onChange} />);
    await user.selectOptions(screen.getByLabelText("Assignee"), "u1");
    expect(onChange).toHaveBeenCalledWith({ status: "", assigneeId: "u1" });
  });
});
