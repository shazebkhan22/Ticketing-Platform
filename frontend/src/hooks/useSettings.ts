import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSmtpSettings, updateSmtpSettings } from "@/api/settings";
import type { SmtpSettingsInput } from "@/types/settings";

const smtpSettingsKey = ["settings", "smtp"] as const;

export function useSmtpSettings() {
  return useQuery({ queryKey: smtpSettingsKey, queryFn: fetchSmtpSettings });
}

export function useUpdateSmtpSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SmtpSettingsInput) => updateSmtpSettings(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smtpSettingsKey });
    },
  });
}
