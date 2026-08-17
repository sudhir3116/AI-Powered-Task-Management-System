import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as workspaceService from "../services/workspaceService";
import { useAuth } from "./AuthContext";

const WorkspaceContext = createContext(null);
const WORKSPACE_STORAGE_KEY = "activeWorkspaceId";

export const WorkspaceProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    if (!isAuthenticated) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      return;
    }

    setLoading(true);
    try {
      const res = await workspaceService.getWorkspaces();
      const list = res.data || [];
      setWorkspaces(list);

      const storedId = sessionStorage.getItem(WORKSPACE_STORAGE_KEY);
      const found = list.find((w) => w._id === storedId || w.id === storedId);

      if (found) {
        setActiveWorkspace(found);
      } else if (list.length > 0) {
        setActiveWorkspace(list[0]);
        sessionStorage.setItem(WORKSPACE_STORAGE_KEY, list[0]._id || list[0].id);
      }
    } catch {
      // Ignore errors silently on workspace fetch
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchWorkspaces();
  }, [fetchWorkspaces]);

  const switchWorkspace = useCallback(
    (workspaceId) => {
      const target = workspaces.find((w) => (w._id || w.id) === workspaceId);
      if (target) {
        setActiveWorkspace(target);
        sessionStorage.setItem(WORKSPACE_STORAGE_KEY, target._id || target.id);
      }
    },
    [workspaces]
  );

  const createNewWorkspace = useCallback(async (name) => {
    const res = await workspaceService.createWorkspace({ name });
    const newWs = res.data;
    setWorkspaces((prev) => [...prev, newWs]);
    setActiveWorkspace(newWs);
    sessionStorage.setItem(WORKSPACE_STORAGE_KEY, newWs._id || newWs.id);
    return newWs;
  }, []);

  const value = useMemo(
    () => ({
      workspaces,
      activeWorkspace,
      switchWorkspace,
      createNewWorkspace,
      refreshWorkspaces: fetchWorkspaces,
      loading,
    }),
    [workspaces, activeWorkspace, switchWorkspace, createNewWorkspace, fetchWorkspaces, loading]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
};
