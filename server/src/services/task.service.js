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
    const [total, pending, inProgress, completed] = await Promise.all([
        Task.countDocuments({ user: userId }),
        Task.countDocuments({ user: userId, status: "Pending" }),
        Task.countDocuments({ user: userId, status: "In Progress" }),
        Task.countDocuments({ user: userId, status: "Completed" }),
    ]);

    return { total, pending, inProgress, completed };
};

export const updateTaskService = async (id, userId, taskData) => {
    return await Task.findOneAndUpdate({ _id: id, user: userId }, taskData, {
        returnDocument: "after",
        runValidators: true
    });
};

export const deleteTaskService = async (id, userId) => {
    return await Task.findOneAndDelete({ _id: id, user: userId });
};
