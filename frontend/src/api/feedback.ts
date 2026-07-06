import { apiClient } from "./client";

export interface PublicFeedbackInfo {
  ticketNo: string;
  companyName: string;
  alreadySubmitted: boolean;
}

export async function fetchPublicFeedback(token: string): Promise<PublicFeedbackInfo> {
  const { data } = await apiClient.get<PublicFeedbackInfo>(`/public/feedback/${token}`);
  return data;
}

export async function submitPublicFeedback(
  token: string,
  input: { rating: number; comment?: string }
): Promise<void> {
  await apiClient.post(`/public/feedback/${token}`, input);
}
