import { apiPrivate } from "../../../api/axios";
import type { User } from "./userSlice";

/* ─── API SHAPES ───────────────────────────────────────────────────── */

export interface RawUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin" | "superadmin" | "examiner";
  pjNumber: string;
  title: string;
  is_active?: boolean; 
  isActive?: boolean;   
  createdAt?: string;
  created_at?: string;
}

/* ─── NORMALIZER ───────────────────────────────────────────────────── */

const normalize = (u: RawUser): User => ({
  ...u,
  id: u.id,
  _id: u.id,
  isActive: u.isActive ?? u.is_active ?? false,
  createdAt: u.createdAt ?? u.created_at ?? "",
});

/* ─── SERVICE METHODS ──────────────────────────────────────────────── */

const getUsers = async (): Promise<User[]> => {
  const response = await apiPrivate.get<{ users: RawUser[] }>("/users");
  return response.data.users.map(normalize);
};

const createUser = async (userData: Partial<User>): Promise<User> => {
  const response = await apiPrivate.post<{ user: RawUser }>("/users", userData);
  return normalize(response.data.user);
};

const updateUser = async (id: string, userData: Partial<User>): Promise<User> => {
  const response = await apiPrivate.put<{ user: RawUser }>(`/users/${id}`, userData);
  return normalize(response.data.user);
};

const updateUserRole = async (userData: { id: string; role: string }): Promise<User> => {
  const response = await apiPrivate.patch<{ user: RawUser }>(`/users/${userData.id}/role`, {
    role: userData.role,
  });
  return normalize(response.data.user);
};

const toggleUserActive = async (userData: { id: string; isActive: boolean }): Promise<User> => {
  const response = await apiPrivate.patch<{ user: RawUser }>(`/users/${userData.id}/toggle`, {
    isActive: userData.isActive,
  });
  return normalize(response.data.user);
};

const deleteUser = async (id: string): Promise<string> => {
  const response = await apiPrivate.delete<{ id: string }>(`/users/${id}`);
  return response.data.id;
};

export const userService = {
  getUsers,
  createUser,
  updateUser,
  updateUserRole,
  toggleUserActive,
  deleteUser,
};