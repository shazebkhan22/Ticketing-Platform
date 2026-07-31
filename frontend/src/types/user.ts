export type UserRole = "admin" | "employee";
export type UserTeam = "FMS" | "Field";

export interface AppUser {
  id: number;
  username: string;
  role: UserRole;
  displayName: string;
  email: string | null;
  createdAt: string;
  isActive: boolean;
  team: UserTeam | null;
}

export interface CreateUserInput {
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
  email?: string;
  team?: UserTeam;
}

export interface AccountManager {
  id: number;
  name: string;
  email: string;
  userId: number | null;
  createdAt: string;
}

export interface CreateAccountManagerInput {
  name: string;
  email: string;
}
