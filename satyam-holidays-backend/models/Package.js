const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: ["domestic", "international"],
    },
    subcategory: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: String,
      required: true,
    },
    price: {
      type: String,
      required: true,
    },
    numericPrice: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 4.5,
    },
    reviews: {
      type: Number,
      default: 0,
    },
    image: {
      type: String,
    },
    description: {
      type: String,
      required: true,
    },
    highlights: [String],
    location: {
      type: String,
      required: true,
    },
    visa: {
      type: String,
      default: "Not Required",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

packageSchema.index({ category: 1, subcategory: 1 });
packageSchema.index({ numericPrice: 1 });

module.exports = mongoose.model("Package", packageSchema);
