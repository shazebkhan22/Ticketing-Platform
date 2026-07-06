import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchPublicFeedback, submitPublicFeedback } from "@/api/feedback";

export function usePublicFeedback(token: string) {
  return useQuery({
    queryKey: ["public-feedback", token],
    queryFn: () => fetchPublicFeedback(token),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useSubmitPublicFeedback(token: string) {
  return useMutation({
    mutationFn: (input: { rating: number; comment?: string }) => submitPublicFeedback(token, input),
  });
}
