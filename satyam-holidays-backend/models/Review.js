const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: [true, "Package ID is required"],
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    comment: {
      type: String,
      required: [true, "Comment is required"],
      trim: true,
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },
    verified: {
      type: Boolean,
      default: false,
    },
    helpful: {
      type: Number,
      default: 0,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "spam"],
      default: "pending",
    },
    spamScore: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
reviewSchema.index({ packageId: 1, createdAt: -1 });
reviewSchema.index({ rating: -1 });
reviewSchema.index({ verified: 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ status: 1, packageId: 1, createdAt: -1 });
// Compound index for review deduplication cooldown (email + packageId within time window)
reviewSchema.index({ email: 1, packageId: 1, createdAt: -1 });

// Virtual for formatted date
reviewSchema.virtual("formattedDate").get(function () {
  return this.createdAt.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
});

// Method to get review summary
reviewSchema.methods.getSummary = function () {
  return {
    id: this._id,
    packageId: this.packageId,
    name: this.name,
    rating: this.rating,
    title: this.title,
    comment: this.comment.substring(0, 150) + (this.comment.length > 150 ? "..." : ""),
    verified: this.verified,
    helpful: this.helpful,
    createdAt: this.formattedDate,
  };
};

// Pre-save middleware to clean data
reviewSchema.pre("save", function (next) {
  // Clean name
  if (this.name) {
    this.name = this.name.trim().replace(/\s+/g, " ");
  }

  // Clean comment
  if (this.comment) {
    this.comment = this.comment.trim();
  }

  next();
});

module.exports = mongoose.model("Review", reviewSchema);
