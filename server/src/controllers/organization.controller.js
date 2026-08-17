import {
  getUserWorkspaces,
  createWorkspace as createWorkspaceService,
  getWorkspaceByIdService,
  updateWorkspaceService,
  deleteWorkspaceService,
} from "../services/organization.service.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await getUserWorkspaces(req.user.id);
  res.status(200).json({
    success: true,
    data: workspaces,
  });
});

export const createWorkspace = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const workspace = await createWorkspaceService(req.user.id, { name });

  res.status(201).json({
    success: true,
    message: "Workspace created successfully",
    data: workspace,
  });
});

export const getCurrentWorkspace = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.workspace,
  });
});

export const getWorkspaceById = asyncHandler(async (req, res) => {
  const workspace = await getWorkspaceByIdService(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    data: workspace,
  });
});

export const updateWorkspace = asyncHandler(async (req, res) => {
  const workspace = await updateWorkspaceService(req.params.id, req.user.id, req.body);
  res.status(200).json({
    success: true,
    message: "Workspace updated successfully",
    data: workspace,
  });
});

export const deleteWorkspace = asyncHandler(async (req, res) => {
  await deleteWorkspaceService(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    message: "Workspace deleted successfully",
  });
});
