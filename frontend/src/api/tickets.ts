import { apiClient } from "./client";
import type {
  ImportResult,
  MetaOptions,
  Summary,
  Ticket,
  TicketDetail,
  TicketFilters,
  TicketFormInput,
  TicketListResponse,
} from "@/types/ticket";

function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function exportTickets(filters: TicketFilters): Promise<void> {
  const params: Record<string, string> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && key !== "page" && key !== "pageSize") {
      params[key] = String(value);
    }
  });
  const { data } = await apiClient.get("/tickets/export", { params, responseType: "blob" });
  triggerDownload(data, `tickets-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function downloadImportTemplate(): Promise<void> {
  const { data } = await apiClient.get("/tickets/import-template", { responseType: "blob" });
  triggerDownload(data, "ticket-import-template.xlsx");
}

export async function importTickets(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<ImportResult>("/tickets/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

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
