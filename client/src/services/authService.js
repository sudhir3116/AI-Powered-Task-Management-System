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

// Google OAuth Login
export const googleLogin = async (credential) => {
  const response = await api.post("/auth/google", { credential });
  return response.data;
};

// Get current user profile
export const getProfile = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

// Logout User
export const logout = () => {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem(USER_STORAGE_KEY);
};
