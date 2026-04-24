const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, "Job type is required"],
      trim: true,
      index: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    errorLog: {
      type: String,
      trim: true,
    },
    nextRunAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    runLockedAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for worker polling
jobSchema.index({ status: 1, nextRunAt: 1, runLockedAt: 1 });

module.exports = mongoose.model("Job", jobSchema);
