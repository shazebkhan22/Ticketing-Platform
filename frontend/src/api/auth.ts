import { apiClient } from "./client";

export interface AuthUser {
  id: number;
  username: string;
  role: "admin" | "employee";
  displayName?: string;
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const { data } = await apiClient.post<AuthUser>("/auth/login", { username, password });
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>("/auth/me");
  return data;
}
