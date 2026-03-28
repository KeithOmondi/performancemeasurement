import { apiPrivate } from "../../../api/axios";

const getUsers = async () => {
  const response = await apiPrivate.get("/users");
  return response.data.users;
};

const createUser = async (userData: any) => {
  const response = await apiPrivate.post("/users", userData);
  return response.data.user;
};

// 🆕 Update full user details
const updateUser = async (id: string, userData: any) => {
  const response = await apiPrivate.put(`/users/${id}`, userData);
  return response.data.user;
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

// 🆕 Delete user
const deleteUser = async (id: string) => {
  const response = await apiPrivate.delete(`/users/${id}`);
  return response.data.id; // Return ID for UI filtering
};

export const userService = { 
  getUsers, 
  createUser, 
  updateUser, 
  updateUserRole, 
  toggleUserActive,
  deleteUser
};