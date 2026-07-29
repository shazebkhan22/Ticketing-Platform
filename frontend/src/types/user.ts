export type UserRole = "admin" | "employee";

export interface AppUser {
  id: number;
  username: string;
  role: UserRole;
  displayName: string;
  email: string | null;
  createdAt: string;
  isActive: boolean;
}

export interface CreateUserInput {
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
  email?: string;
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
