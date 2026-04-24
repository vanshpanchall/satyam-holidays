const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
  {
    referrerEmail: {
      type: String,
      required: [true, "Referrer email is required"],
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"],
    },
    refereeEmail: {
      type: String,
      required: [true, "Referee email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"],
    },
    referralCode: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    rewardSent: {
      type: Boolean,
      default: false,
    },
    rewardCode: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
referralSchema.index({ referrerEmail: 1 });
referralSchema.index({ refereeEmail: 1 }, { unique: true });
referralSchema.index({ referralCode: 1 });

module.exports = mongoose.model("Referral", referralSchema);
