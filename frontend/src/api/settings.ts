import { apiClient } from "./client";
import type { SmtpSettings, SmtpSettingsInput } from "@/types/settings";

export async function fetchSmtpSettings(): Promise<SmtpSettings> {
  const { data } = await apiClient.get<SmtpSettings>("/settings/smtp");
  return data;
}

export async function updateSmtpSettings(input: SmtpSettingsInput): Promise<void> {
  await apiClient.put("/settings/smtp", input);
}
