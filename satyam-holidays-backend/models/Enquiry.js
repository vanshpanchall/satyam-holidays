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
    leadScore: {
      type: Number,
      default: 0,
    },
    slaStatus: {
      type: String,
      enum: ["within_sla", "sla_warning", "sla_breached"],
      default: "within_sla",
    },
    respondedAt: {
      type: Date,
    },
    followUps: [
      {
        sentAt: { type: Date, default: Date.now },
        type: { type: String },
      },
    ],
    referralCodeUsed: {
      type: String,
    },
    visaRequired: {
      type: Boolean,
      default: false,
    },
    travelInsurance: {
      type: Boolean,
      default: false,
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
enquirySchema.index({ leadScore: -1 });
enquirySchema.index({ slaStatus: 1 });

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

// Pre-save middleware to clean data and calculate leadScore and SLA status
enquirySchema.pre("save", function (next) {
  // Clean phone number
  if (this.phone) {
    this.phone = this.phone.replace(/[^\d+\-()\s]/g, "");
  }

  // Clean name
  if (this.name) {
    this.name = this.name.trim().replace(/\s+/g, " ");
  }

  // Calculate Lead Score
  let score = 0;

  // 1. Budget Points
  const budgetScores = {
    "under-20k": 10,
    "20k-50k": 25,
    "50k-1l": 40,
    "above-1l": 50,
  };
  score += budgetScores[this.budget] || 0;

  // 2. Travelers Points
  const travelerScores = {
    1: 10,
    2: 20,
    3: 30,
    4: 40,
    "5+": 50,
  };
  score += travelerScores[this.travelers] || 0;

  // 3. Destination Intent (non-custom is higher intent)
  if (this.destination && this.destination !== "custom") {
    score += 15;
  }

  // 4. Message Depth
  if (this.message && this.message.length > 100) {
    score += 15;
  }

  // 5. Travel Urgency (within 30 days)
  if (this.travelDate) {
    const diffTime = new Date(this.travelDate) - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0 && diffDays <= 30) {
      score += 20; // Urgent
    } else if (diffDays > 30 && diffDays <= 90) {
      score += 10; // Medium urgency
    }
  }

  // 6. Optional Add-ons (Visa/Insurance)
  if (this.visaRequired) score += 10;
  if (this.travelInsurance) score += 10;

  this.leadScore = score;

  // Manage SLA and Responded At
  if (this.isModified("status") && this.status !== "pending" && !this.respondedAt) {
    this.respondedAt = new Date();
  }

  const createdTime = this.createdAt || new Date();
  const endTime = this.respondedAt || new Date();
  const durationMs = endTime - createdTime;
  const twoHoursMs = 2 * 60 * 60 * 1000;

  if (durationMs > twoHoursMs) {
    this.slaStatus = "sla_breached";
  } else if (durationMs > 1.5 * 60 * 60 * 1000) {
    this.slaStatus = "sla_warning";
  } else {
    this.slaStatus = "within_sla";
  }

  next();
});

module.exports = mongoose.model("Enquiry", enquirySchema);
