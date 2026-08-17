import Task from "../models/task.model.js";
import OrganizationMember from "../models/organizationMember.model.js";

export const getWorkspaceAnalyticsService = async (workspaceId, actorUserId, actorRole) => {
  const now = new Date();
  const filter = { organization: workspaceId };

  const [
    totalTasks,
    completedTasks,
    inProgressTasks,
    pendingTasks,
    overdueTasks,
    highPriorityTasks,
    mediumPriorityTasks,
    lowPriorityTasks,
  ] = await Promise.all([
    Task.countDocuments(filter),
    Task.countDocuments({ ...filter, status: "Completed" }),
    Task.countDocuments({ ...filter, status: "In Progress" }),
    Task.countDocuments({ ...filter, status: "Pending" }),
    Task.countDocuments({
      ...filter,
      status: { $ne: "Completed" },
      dueDate: { $lt: now, $ne: null },
    }),
    Task.countDocuments({ ...filter, priority: "High" }),
    Task.countDocuments({ ...filter, priority: "Medium" }),
    Task.countDocuments({ ...filter, priority: "Low" }),
  ]);

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Upcoming deadlines in next 7 days
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingTasks = await Task.find({
    ...filter,
    status: { $ne: "Completed" },
    dueDate: { $gte: now, $lte: sevenDaysFromNow },
  })
    .sort({ dueDate: 1 })
    .limit(5)
    .select("title dueDate priority status");

  // Member workload aggregation
  const memberTaskAgg = await Task.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$user",
        totalTasks: { $sum: 1 },
        completedTasks: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
        inProgressTasks: { $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] } },
        overdueTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$status", "Completed"] },
                  { $ne: ["$dueDate", null] },
                  { $lt: ["$dueDate", now] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const taskStatsMap = new Map();
  memberTaskAgg.forEach((item) => {
    if (item._id) taskStatsMap.set(item._id.toString(), item);
  });

  // Get all members of the workspace
  const workspaceMembers = await OrganizationMember.find({ organization: workspaceId }).populate(
    "user",
    "name email avatar"
  );

  const memberStats = workspaceMembers
    .filter((m) => m.user)
    .map((m) => {
      const uId = m.user._id.toString();
      const stats = taskStatsMap.get(uId) || {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
      };

      const mCompletionRate =
        stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

      return {
        user: {
          id: m.user._id,
          _id: m.user._id,
          name: m.user.name,
          email: m.user.email,
          avatar: m.user.avatar || null,
        },
        role: m.role,
        totalTasks: stats.totalTasks,
        completedTasks: stats.completedTasks,
        inProgressTasks: stats.inProgressTasks,
        overdueTasks: stats.overdueTasks,
        completionRate: mCompletionRate,
      };
    });

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    pendingTasks,
    overdueTasks,
    completionRate,
    highPriorityTasks,
    mediumPriorityTasks,
    lowPriorityTasks,
    upcomingTasks,
    memberStats,
  };
};
