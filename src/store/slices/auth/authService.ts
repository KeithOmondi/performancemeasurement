import { api } from "../../../api/axios";

const requestOTP = async (pjNumber: string) => {
  const response = await api.post("/auth/request-otp", { pjNumber });
  return response.data;
};

const login = async (loginData: { pjNumber: string; otp: string }) => {
  const response = await api.post("/auth/login", loginData);
  return response.data;
};

const register = async (userData: any) => {
  const response = await api.post("/auth/register", userData);
  return response.data;
};

const logout = async () => {
  const response = await api.post("/auth/logout");
  return response.data;
};

// Calls /auth/refresh — backend validates the refresh cookie
// and returns the user object + sets a new access cookie
const checkAuth = async () => {
  const response = await api.get("/auth/refresh");
  return response.data;
};

export const authService = { requestOTP, login, register, logout, checkAuth };