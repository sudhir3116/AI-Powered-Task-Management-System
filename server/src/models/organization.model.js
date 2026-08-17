import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isPersonal: {
      type: Boolean,
      default: false,
    },
    subscription: {
      plan: {
        type: String,
        enum: ["FREE", "PRO", "BUSINESS", "ENTERPRISE"],
        default: "FREE",
      },
      status: {
        type: String,
        enum: ["ACTIVE", "TRIAL", "CANCELED"],
        default: "ACTIVE",
      },
      currentPeriodEnd: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

const Organization = mongoose.model("Organization", organizationSchema);

export default Organization;
