import { api } from "../../../api/axios";

/* ─── TYPES ────────────────────────────────────────────────────────── */

export interface User {
  id: string;
  name: string;
  email: string;
  pjNumber: string;
  role: "user" | "admin" | "superadmin" | "examiner";
}

export interface AuthResponse {
  user: User;
  message?: string;
}

export interface StatusResponse {
  message: string;
}

/* ─── SERVICE ──────────────────────────────────────────────────────── */

const requestOTP = async (pjNumber: string): Promise<StatusResponse> => {
  const response = await api.post<StatusResponse>("/auth/request-otp", { pjNumber });
  return response.data;
};

const login = async (loginData: { pjNumber: string; otp: string }): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/auth/login", loginData);
  return response.data;
};

const register = async (userData: Partial<User>): Promise<StatusResponse> => {
  const response = await api.post<StatusResponse>("/auth/register", userData);
  return response.data;
};

const logout = async (): Promise<StatusResponse> => {
  const response = await api.post<StatusResponse>("/auth/logout");
  return response.data;
};

/**
 * Validates the refresh cookie via backend.
 * Returns the user object and sets a new access cookie.
 */
const checkAuth = async (): Promise<AuthResponse> => {
  const response = await api.get<AuthResponse>("/auth/refresh");
  return response.data;
};

export const authService = { requestOTP, login, register, logout, checkAuth };