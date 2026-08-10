import api from "../api/axios";

const USER_STORAGE_KEY = "user";

// Register User
export const register = async (userData) => {
  const response = await api.post("/auth/register", userData);
  return response.data;
};

// Login User
export const login = async (userData) => {
  const response = await api.post("/auth/login", userData);
  return response.data;
};

// Logout User
export const logout = () => {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem(USER_STORAGE_KEY);
};
