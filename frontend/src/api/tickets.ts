import { apiClient } from "./client";
import type {
  MetaOptions,
  Summary,
  Ticket,
  TicketDetail,
  TicketFilters,
  TicketFormInput,
  TicketListResponse,
} from "@/types/ticket";

export async function fetchSummary(): Promise<Summary> {
  const { data } = await apiClient.get<Summary>("/tickets/summary");
  return data;
}

export async function fetchTickets(filters: TicketFilters): Promise<TicketListResponse> {
  const params: Record<string, string> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params[key] = String(value);
    }
  });
  const { data } = await apiClient.get<TicketListResponse>("/tickets", { params });
  return data;
}

export async function fetchTicket(srNo: number): Promise<TicketDetail> {
  const { data } = await apiClient.get<TicketDetail>(`/tickets/${srNo}`);
  return data;
}

export async function createTicket(input: TicketFormInput): Promise<Ticket> {
  const { data } = await apiClient.post<Ticket>("/tickets", input);
  return data;
}

export async function updateTicket(
  srNo: number,
  input: Partial<TicketFormInput>
): Promise<Ticket> {
  const { data } = await apiClient.put<Ticket>(`/tickets/${srNo}`, input);
  return data;
}

export async function updateTicketStatus(srNo: number, status: string): Promise<Ticket> {
  const { data } = await apiClient.patch<Ticket>(`/tickets/${srNo}/status`, { status });
  return data;
}

export async function updateTicketFeedback(srNo: number, feedback: string): Promise<Ticket> {
  const { data } = await apiClient.patch<Ticket>(`/tickets/${srNo}/feedback`, { feedback });
  return data;
}

export async function deleteTicket(srNo: number): Promise<void> {
  await apiClient.delete(`/tickets/${srNo}`);
}

export async function addRemark(
  srNo: number,
  body: string,
  remarkDate?: string
): Promise<void> {
  await apiClient.post(`/tickets/${srNo}/remarks`, { body, remarkDate });
}

export async function fetchMetaOptions(): Promise<MetaOptions> {
  const { data } = await apiClient.get<MetaOptions>("/meta/options");
  return data;
}
