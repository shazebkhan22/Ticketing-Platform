import { apiClient } from "./client";
import type { AccountManager, CreateAccountManagerInput } from "@/types/user";

export async function fetchAccountManagers(): Promise<AccountManager[]> {
  const { data } = await apiClient.get<AccountManager[]>("/account-managers");
  return data;
}

export async function createAccountManager(input: CreateAccountManagerInput): Promise<AccountManager> {
  const { data } = await apiClient.post<AccountManager>("/account-managers", input);
  return data;
}

export async function updateAccountManager(
  id: number,
  input: CreateAccountManagerInput
): Promise<AccountManager> {
  const { data } = await apiClient.patch<AccountManager>(`/account-managers/${id}`, input);
  return data;
}
