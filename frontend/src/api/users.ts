import { apiClient } from "./client";
import type { AppUser, CreateUserInput } from "@/types/user";

export async function fetchUsers(): Promise<AppUser[]> {
  const { data } = await apiClient.get<AppUser[]>("/users");
  return data;
}

export async function createUser(input: CreateUserInput): Promise<AppUser> {
  const { data } = await apiClient.post<AppUser>("/users", input);
  return data;
}
