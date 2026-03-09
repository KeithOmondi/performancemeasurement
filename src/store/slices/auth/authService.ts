import { api } from "../../../api/axios";

const register = async (userData: any) => {
  const response = await api.post("/auth/register", userData);
  return response.data.user; 
};

const login = async (userData: any) => {
  const response = await api.post("/auth/login", userData);
  return response.data.user;
};

const logout = async () => {
  const response = await api.post("/auth/logout");
  return response.data;
};

const checkAuth = async () => {
  const response = await api.get("/auth/refresh");
  return response.data.user;
};

export const authService = { register, login, logout, checkAuth };