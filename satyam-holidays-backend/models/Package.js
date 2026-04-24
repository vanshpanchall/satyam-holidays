const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: ["domestic", "international"],
        message: "Category must be either domestic or international",
      },
    },
    subcategory: {
      type: String,
      required: [true, "Subcategory is required"],
      trim: true,
      maxlength: [100, "Subcategory cannot exceed 100 characters"],
    },
    name: {
      type: String,
      required: [true, "Package name is required"],
      trim: true,
      maxlength: [200, "Package name cannot exceed 200 characters"],
    },
    duration: {
      type: String,
      required: [true, "Duration is required"],
      maxlength: [50, "Duration cannot exceed 50 characters"],
    },
    price: {
      type: String,
      required: [true, "Price is required"],
      maxlength: [50, "Price cannot exceed 50 characters"],
    },
    numericPrice: {
      type: Number,
      default: 0,
      min: [0, "Price cannot be negative"],
    },
    rating: {
      type: Number,
      default: 4.5,
      min: [0, "Rating cannot be below 0"],
      max: [5, "Rating cannot exceed 5"],
    },
    reviews: {
      type: Number,
      default: 0,
      min: [0, "Reviews count cannot be negative"],
    },
    image: {
      type: String,
      maxlength: [500, "Image URL cannot exceed 500 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    highlights: {
      type: [String],
      validate: {
        validator: (v) => v.length <= 20,
        message: "Cannot have more than 20 highlights",
      },
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      maxlength: [200, "Location cannot exceed 200 characters"],
    },
    visa: {
      type: String,
      default: "Not Required",
      maxlength: [100, "Visa info cannot exceed 100 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    availableDates: [
      {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        capacity: { type: Number, required: true, default: 20 },
        booked: { type: Number, default: 0 },
        status: {
          type: String,
          enum: ["available", "filling_fast", "sold_out"],
          default: "available",
        },
        priceOverride: { type: Number },
      },
    ],
    itinerary: [
      {
        day: { type: Number, required: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        meals: { type: [String], default: [] },
      },
    ],
    promotions: [
      {
        code: { type: String, uppercase: true, trim: true },
        discountPercent: { type: Number, min: 0, max: 100 },
        validFrom: { type: Date },
        validUntil: { type: Date },
        description: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to auto-generate slug
packageSchema.pre("save", function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }
  next();
});

// Optimized indexes for common queries
packageSchema.index({ category: 1, subcategory: 1 });
packageSchema.index({ numericPrice: 1 });
packageSchema.index({ isActive: 1 }); // Frequently filtered
packageSchema.index({ isActive: 1, category: 1 }); // Combined filter
packageSchema.index({ rating: -1 }); // For sorting by rating
packageSchema.index({ createdAt: -1 }); // For recent packages
packageSchema.index({ slug: 1 }); // Unique slug lookups

module.exports = mongoose.model("Package", packageSchema);
