export type UserRole = "administrator" | "user";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CLOSED";

export interface UserSummary {
  id: string;
  email: string;
  role: UserRole;
}

export interface ProjectTicketCounts {
  open: number;
  active: number;
  done: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  created_at: string;
  ticket_counts: ProjectTicketCounts;
}

export interface AssigneeSummary {
  user_id: string;
  email: string;
  has_progress_update: boolean;
}

export interface TicketResponse {
  id: string;
  project_id: string;
  parent_ticket_id: string | null;
  title: string;
  description: string | null;
  status: TicketStatus;
  created_by: UserSummary;
  created_at: string;
  updated_at: string;
  assignees: AssigneeSummary[];
  follow_up_count?: number;
}

export interface TicketListResponse {
  items: TicketResponse[];
  total: number;
}

export interface TicketCreate {
  title: string;
  description?: string | null;
}

export interface TicketUpdate {
  title?: string;
  description?: string | null;
}

export interface AssignmentResponse {
  ticket_id: string;
  user_id: string;
  assigned_at: string;
}

export interface ProgressUpdateResponse {
  ticket_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ProgressListResponse {
  items: ProgressUpdateResponse[];
}

export interface TransitionBlockedError {
  detail: string;
  missing_updates: { user_id: string; email: string }[];
}

export interface TicketEventResponse {
  id: string;
  ticket_id: string;
  event_type: string;
  actor: UserSummary;
  prev_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
}

export interface EventListResponse {
  items: TicketEventResponse[];
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export const WORKFLOW_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["IN_REVIEW"],
  IN_REVIEW: ["DONE", "IN_PROGRESS"],
  DONE: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
  CLOSED: "Closed",
};
