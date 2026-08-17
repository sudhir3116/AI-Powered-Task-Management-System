import User from "../models/user.model.js";

const systemAdminMiddleware = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const user = await User.findById(req.user.id);
    if (!user || user.systemRole !== "SYSTEM_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. System Admin role required.",
      });
    }

    req.systemUser = user;
    next();
  } catch (error) {
    next(error);
  }
};

export default systemAdminMiddleware;
