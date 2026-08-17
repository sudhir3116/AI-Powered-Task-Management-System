import api from "../api/axios";

export const getWorkspaces = async () => {
  const response = await api.get("/workspaces");
  return response.data;
};

export const createWorkspace = async (workspaceData) => {
  const response = await api.post("/workspaces", workspaceData);
  return response.data;
};

export const getCurrentWorkspace = async () => {
  const response = await api.get("/workspaces/current");
  return response.data;
};

export const updateWorkspace = async (workspaceId, workspaceData) => {
  const response = await api.patch(`/workspaces/${workspaceId}`, workspaceData);
  return response.data;
};

export const deleteWorkspace = async (workspaceId) => {
  const response = await api.delete(`/workspaces/${workspaceId}`);
  return response.data;
};

export const getWorkspaceMembers = async (workspaceId) => {
  const response = await api.get(`/workspaces/${workspaceId}/members`);
  return response.data;
};

export const updateMemberRole = async (workspaceId, memberId, role) => {
  const response = await api.patch(`/workspaces/${workspaceId}/members/${memberId}`, { role });
  return response.data;
};

export const removeWorkspaceMember = async (workspaceId, memberId) => {
  const response = await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
  return response.data;
};

export const getPendingInvitations = async (workspaceId) => {
  const response = await api.get(`/workspaces/${workspaceId}/invitations`);
  return response.data;
};

export const inviteWorkspaceMember = async (workspaceId, invitationData) => {
  const response = await api.post(`/workspaces/${workspaceId}/invitations`, invitationData);
  return response.data;
};

export const resendWorkspaceInvitation = async (workspaceId, invitationId) => {
  const response = await api.post(`/workspaces/${workspaceId}/invitations/${invitationId}/resend`);
  return response.data;
};

export const cancelWorkspaceInvitation = async (workspaceId, invitationId) => {
  const response = await api.delete(`/workspaces/${workspaceId}/invitations/${invitationId}`);
  return response.data;
};

export const getInvitationDetails = async (token) => {
  const response = await api.get(`/invitations/${token}`);
  return response.data;
};

export const acceptInvitation = async (token) => {
  const response = await api.post(`/invitations/${token}/accept`);
  return response.data;
};

export const getWorkspaceAnalytics = async (workspaceId) => {
  const response = await api.get(`/workspaces/${workspaceId}/analytics`);
  return response.data;
};

export const getWorkspaceAuditLogs = async (workspaceId, params = {}) => {
  const response = await api.get(`/workspaces/${workspaceId}/audit-logs`, { params });
  return response.data;
};
