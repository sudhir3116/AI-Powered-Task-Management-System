import Task from "../models/task.model.js";

export const createTaskService = async (taskData) => {
    return await Task.create(taskData);
};

export const getAllTasksService = async (
    filter,
    page = 1,
    limit = 10,
    sort = "createdAt",
    order = "desc"
) => {
    const skip = (page - 1) * limit;
    const sortOrder = order === "asc" ? 1 : -1;

    const totalTasks = await Task.countDocuments(filter);

    let tasks;

    if (sort === "priority") {
        // Map priority to numeric rank: High=1, Medium=2, Low=3
        const pipeline = [
            { $match: filter },
            {
                $addFields: {
                    priorityRank: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$priority", "High"] }, then: 1 },
                                { case: { $eq: ["$priority", "Medium"] }, then: 2 },
                            ],
                            default: 3,
                        },
                    },
                },
            },
            { $sort: { priorityRank: sortOrder } },
            { $skip: skip },
            { $limit: limit },
            { $project: { priorityRank: 0 } },
        ];

        tasks = await Task.aggregate(pipeline);
    } else {
        // Fallback to normal field sorting (e.g., createdAt)
        const sortObj = { [sort]: sortOrder };
        tasks = await Task.find(filter).sort(sortObj).skip(skip).limit(limit);
    }

    const totalPages = Math.max(1, Math.ceil(totalTasks / limit));

    return {
        tasks,
        totalTasks,
        totalPages,
        page,
        limit,
    };
};

export const getTaskStatisticsService = async (userId) => {
    const now = new Date();

    const [total, pending, inProgress, completed, overdue, priorityDist] = await Promise.all([
        Task.countDocuments({ user: userId }),
        Task.countDocuments({ user: userId, status: "Pending" }),
        Task.countDocuments({ user: userId, status: "In Progress" }),
        Task.countDocuments({ user: userId, status: "Completed" }),
        // Overdue = Pending or In Progress with dueDate in the past
        Task.countDocuments({
            user: userId,
            status: { $in: ["Pending", "In Progress"] },
            dueDate: { $lt: now, $ne: null },
        }),
        // Priority distribution
        Task.aggregate([
            { $match: { user: userId } },
            { $group: { _id: "$priority", count: { $sum: 1 } } },
        ]),
    ]);

    // Upcoming deadlines (tasks due in next 7 days, not completed)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingDeadlines = await Task.find({
        user: userId,
        status: { $ne: "Completed" },
        dueDate: { $gte: now, $lte: sevenDaysFromNow },
    })
        .sort({ dueDate: 1 })
        .limit(5)
        .select("title dueDate priority status");

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const priorityDistribution = { High: 0, Medium: 0, Low: 0 };
    priorityDist.forEach(({ _id, count }) => {
        if (_id in priorityDistribution) priorityDistribution[_id] = count;
    });

    return {
        total,
        pending,
        inProgress,
        completed,
        overdue,
        completionRate,
        priorityDistribution,
        upcomingDeadlines,
    };
};

export const updateTaskService = async (id, userId, taskData) => {
    // Auto-stamp completedAt when marking as Completed
    if (taskData.status === "Completed") {
        taskData.completedAt = taskData.completedAt || new Date();
    } else if (taskData.status && taskData.status !== "Completed") {
        // Clear completedAt if un-completing
        taskData.completedAt = null;
    }

    return await Task.findOneAndUpdate({ _id: id, user: userId }, taskData, {
        returnDocument: "after",
        runValidators: true,
    });
};

export const deleteTaskService = async (id, userId) => {
    return await Task.findOneAndDelete({ _id: id, user: userId });
};
