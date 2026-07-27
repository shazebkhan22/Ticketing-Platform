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
