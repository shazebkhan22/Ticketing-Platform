import { apiClient } from "./client";

export interface AuthUser {
  id: number;
  username: string;
  role: "admin" | "employee";
  displayName?: string;
  email?: string;
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

export async function updateProfile(displayName: string, email: string): Promise<AuthUser> {
  const { data } = await apiClient.patch<AuthUser>("/auth/profile", { displayName, email });
  return data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await apiClient.patch("/auth/password", { currentPassword, newPassword });
}
