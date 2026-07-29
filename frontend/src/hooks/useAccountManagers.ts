import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAccountManagers, createAccountManager, updateAccountManager } from "@/api/accountManagers";
import type { CreateAccountManagerInput } from "@/types/user";

const accountManagersKey = ["account-managers"] as const;

export function useAccountManagers() {
  return useQuery({ queryKey: accountManagersKey, queryFn: fetchAccountManagers });
}

export function useCreateAccountManager() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAccountManagerInput) => createAccountManager(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountManagersKey });
      // The Project form's Account Manager dropdown is sourced from
      // /meta/options — refresh it too so a newly added account manager
      // shows up there without a full page reload.
      queryClient.invalidateQueries({ queryKey: ["meta", "options"] });
    },
  });
}

export function useUpdateAccountManager() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: CreateAccountManagerInput }) =>
      updateAccountManager(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountManagersKey });
      queryClient.invalidateQueries({ queryKey: ["meta", "options"] });
    },
  });
}
