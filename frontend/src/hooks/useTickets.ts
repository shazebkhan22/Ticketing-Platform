import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addRemark,
  createTicket,
  deleteTicket,
  downloadImportTemplate,
  exportTickets,
  fetchAnalytics,
  fetchMetaOptions,
  fetchSummary,
  fetchTicket,
  fetchTickets,
  importTickets,
  updateAdminFeedbackResponse,
  updateTicket,
  updateTicketStatus,
} from "@/api/tickets";
import type { TicketFilters, TicketFormInput } from "@/types/ticket";

export const ticketKeys = {
  all: ["tickets"] as const,
  summary: (assigneeUserId?: number) => [...ticketKeys.all, "summary", assigneeUserId ?? null] as const,
  list: (filters: TicketFilters) => [...ticketKeys.all, "list", filters] as const,
  detail: (srNo: number) => [...ticketKeys.all, "detail", srNo] as const,
  meta: () => ["meta", "options"] as const,
  analytics: () => [...ticketKeys.all, "analytics"] as const,
};

export function useSummary(assigneeUserId?: number) {
  return useQuery({
    queryKey: ticketKeys.summary(assigneeUserId),
    queryFn: () => fetchSummary(assigneeUserId),
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: ticketKeys.analytics(),
    queryFn: fetchAnalytics,
  });
}

export function useTicketList(filters: TicketFilters) {
  return useQuery({
    queryKey: ticketKeys.list(filters),
    queryFn: () => fetchTickets(filters),
  });
}

export function useTicketDetail(srNo: number) {
  return useQuery({
    queryKey: ticketKeys.detail(srNo),
    queryFn: () => fetchTicket(srNo),
    enabled: Number.isFinite(srNo),
  });
}

export function useMetaOptions() {
  return useQuery({ queryKey: ticketKeys.meta(), queryFn: fetchMetaOptions });
}

function useInvalidateTicket(srNo?: number) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    if (srNo !== undefined) {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(srNo) });
    }
  };
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TicketFormInput) => createTicket(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    },
  });
}

export function useUpdateTicket(srNo: number) {
  const invalidate = useInvalidateTicket(srNo);
  return useMutation({
    mutationFn: (input: Partial<TicketFormInput>) => updateTicket(srNo, input),
    onSuccess: invalidate,
  });
}

export function useUpdateTicketStatus(srNo: number) {
  const invalidate = useInvalidateTicket(srNo);
  return useMutation({
    mutationFn: (status: string) => updateTicketStatus(srNo, status),
    onSuccess: invalidate,
  });
}

export function useUpdateAdminFeedbackResponse(srNo: number) {
  const invalidate = useInvalidateTicket(srNo);
  return useMutation({
    mutationFn: (response: string) => updateAdminFeedbackResponse(srNo, response),
    onSuccess: invalidate,
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (srNo: number) => deleteTicket(srNo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    },
  });
}

export function useAddRemark(srNo: number) {
  const invalidate = useInvalidateTicket(srNo);
  return useMutation({
    mutationFn: (body: string) => addRemark(srNo, body),
    onSuccess: invalidate,
  });
}

export function useExportTickets() {
  return useMutation({
    mutationFn: (filters: TicketFilters) => exportTickets(filters),
  });
}

export function useDownloadImportTemplate() {
  return useMutation({
    mutationFn: () => downloadImportTemplate(),
  });
}

export function useImportTickets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => importTickets(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    },
  });
}
