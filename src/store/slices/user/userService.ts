import { apiPrivate } from "../../../api/axios";

// Get all users
const getUsers = async () => {
  const response = await apiPrivate.get("/users");
  // Matches controller: res.status(200).json({ users: [...] })
  return response.data.users; 
};

// Update user role
const updateUserRole = async (userData: { id: string; role: string }) => {
  const response = await apiPrivate.patch(`/users/${userData.id}/role`, { 
    role: userData.role 
  });
  // Matches controller: res.status(200).json({ user: {...} })
  return response.data.user;
};

// Toggle user status
const toggleUserActive = async (userData: { id: string; isActive: boolean }) => {
  const response = await apiPrivate.patch(`/users/${userData.id}/toggle`, { 
    isActive: userData.isActive 
  });
  return response.data.user;
};

export const userService = {
  getUsers,
  updateUserRole,
  toggleUserActive,
};