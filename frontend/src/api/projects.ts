import { apiClient } from "./client";
import type { ProjectSummary, TicketListResponse } from "../types";

export async function listProjects(): Promise<ProjectSummary[]> {
  const { data } = await apiClient.get<{ items: ProjectSummary[] }>("/projects");
  return data.items;
}

export async function listTickets(
  projectId: string,
  params?: { status?: string; assignee_id?: string; page?: number; page_size?: number }
): Promise<TicketListResponse> {
  const { data } = await apiClient.get<TicketListResponse>(
    `/projects/${projectId}/tickets`,
    { params }
  );
  return data;
}
