import { apiPrivate } from "../../../api/axios";
import type { User } from "./userSlice";

/* ------------------------------------------------------------------ */
/*  Raw API shape (what PostgreSQL returns before normalization)        */
/* ------------------------------------------------------------------ */

export interface RawUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin" | "superadmin" | "examiner";
  pjNumber: string;
  title: string;
  is_active?: boolean;   // some endpoints return snake_case
  isActive?: boolean;    // some endpoints return camelCase
  createdAt?: string;
  created_at?: string;
}

/* ------------------------------------------------------------------ */
/*  Normalizer                                                          */
/* ------------------------------------------------------------------ */

/** Normalize a raw PG user into the consistent frontend `User` shape */
const normalize = (u: RawUser): User => ({
  ...u,
  id: u.id,
  _id: u.id,                                        // mirror so both work
  isActive: u.isActive ?? u.is_active ?? false,     // handle both casings
  createdAt: u.createdAt ?? u.created_at ?? "",     // handle both casings
});

/* ------------------------------------------------------------------ */
/*  Service methods                                                     */
/* ------------------------------------------------------------------ */

const getUsers = async (): Promise<User[]> => {
  const response = await apiPrivate.get("/users");
  return (response.data.users as RawUser[]).map(normalize);
};

const createUser = async (userData: any): Promise<User> => {
  const response = await apiPrivate.post("/users", userData);
  return normalize(response.data.user as RawUser);
};

const updateUser = async (id: string, userData: any): Promise<User> => {
  const response = await apiPrivate.put(`/users/${id}`, userData);
  return normalize(response.data.user as RawUser);
};

const updateUserRole = async (userData: { id: string; role: string }): Promise<User> => {
  const response = await apiPrivate.patch(`/users/${userData.id}/role`, {
    role: userData.role,
  });
  return normalize(response.data.user as RawUser);
};

const toggleUserActive = async (userData: { id: string; isActive: boolean }): Promise<User> => {
  const response = await apiPrivate.patch(`/users/${userData.id}/toggle`, {
    isActive: userData.isActive,
  });
  return normalize(response.data.user as RawUser);
};

const deleteUser = async (id: string): Promise<string> => {
  const response = await apiPrivate.delete(`/users/${id}`);
  return response.data.id as string;
};

export const userService = {
  getUsers,
  createUser,
  updateUser,
  updateUserRole,
  toggleUserActive,
  deleteUser,
};