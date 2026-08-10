import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";
import * as authService from "../services/authService";

const AuthContext = createContext(null);
const USER_STORAGE_KEY = "user";

const getStoredUser = () => {
  try {
    const storedUser = sessionStorage.getItem(USER_STORAGE_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    sessionStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const token = sessionStorage.getItem("token");
    const storedUser = getStoredUser();

    if (token && storedUser) {
      return storedUser;
    }

    if (token) {
      sessionStorage.removeItem("token");
    }

    return null;
  });
  const loading = false;

  const register = async (userData) => {
    return await authService.register(userData);
  };

  const login = async (userData) => {
    const response = await authService.login(userData);
    const session = response.data;

    if (!session?.token || !session?.user) {
      throw new Error("Invalid login response from server");
    }

    sessionStorage.setItem("token", session.token);
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user));
    setUser(session.user);

    return response;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      register,
      login,
      logout,
      isAuthenticated: Boolean(user),
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// This hook intentionally shares the context module with its provider.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
