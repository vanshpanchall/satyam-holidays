const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema(
  {
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
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    destination: {
      type: String,
      enum: [
        "domestic",
        "international",
        "chardham",
        "kashmir",
        "dubai",
        "singapore",
        "thailand",
        "vietnam",
        "nepal",
        "andaman",
        "custom",
      ],
      default: "custom",
    },
    travelDate: {
      type: Date,
    },
    travelers: {
      type: String,
      enum: ["1", "2", "3", "4", "5+"],
      default: "2",
    },
    budget: {
      type: String,
      enum: ["under-20k", "20k-50k", "50k-1l", "above-1l"],
      default: "20k-50k",
    },
    message: {
      type: String,
      trim: true,
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    status: {
      type: String,
      enum: ["pending", "contacted", "confirmed", "cancelled"],
      default: "pending",
    },
    source: {
      type: String,
      default: "website",
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
enquirySchema.index({ createdAt: -1 });
enquirySchema.index({ email: 1, createdAt: -1 });
enquirySchema.index({ status: 1, createdAt: -1 });
enquirySchema.index({ destination: 1 });
enquirySchema.index({ phone: 1 });
enquirySchema.index({ source: 1 });
enquirySchema.index({ ipAddress: 1 });
enquirySchema.index({ status: 1, destination: 1 });
enquirySchema.index({ createdAt: -1, status: 1 });

// Virtual for formatted date
enquirySchema.virtual("formattedDate").get(function () {
  return this.createdAt.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
});

// Method to get enquiry summary
enquirySchema.methods.getSummary = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    destination: this.destination,
    travelers: this.travelers,
    budget: this.budget,
    status: this.status,
    createdAt: this.formattedDate,
  };
};

// Pre-save middleware to clean data
enquirySchema.pre("save", function (next) {
  // Clean phone number
  if (this.phone) {
    this.phone = this.phone.replace(/[^\d+\-()\s]/g, "");
  }

  // Clean name
  if (this.name) {
    this.name = this.name.trim().replace(/\s+/g, " ");
  }

  next();
});

module.exports = mongoose.model("Enquiry", enquirySchema);
