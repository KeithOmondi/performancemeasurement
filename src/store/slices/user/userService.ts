import { apiPrivate } from "../../../api/axios";

const getUsers = async () => {
  const response = await apiPrivate.get("/users");
  return response.data.users;
};

const updateUserRole = async (userData: { id: string; role: string }) => {
  const response = await apiPrivate.patch(`/users/${userData.id}/role`, {
    role: userData.role,
  });
  return response.data.user;
};

const toggleUserActive = async (userData: { id: string; isActive: boolean }) => {
  const response = await apiPrivate.patch(`/users/${userData.id}/toggle`, {
    isActive: userData.isActive,
  });
  return response.data.user;
};

export const userService = { getUsers, updateUserRole, toggleUserActive };