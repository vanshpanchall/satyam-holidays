const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const Joi = require("joi");
const router = express.Router();
const packageService = require("../services/packageService");
const cacheService = require("../utils/cache");
const auth = require("../middleware/auth");
const logger = require("../utils/logger");
const { uploadImage } = require("../utils/cloudinary");

// ─── Joi validation schemas ───
const packageSchema = Joi.object({
  category: Joi.string().valid("domestic", "international").required().messages({
    "any.only": "Category must be either domestic or international",
    "any.required": "Category is required",
  }),
  subcategory: Joi.string().trim().max(100).required().messages({
    "string.max": "Subcategory cannot exceed 100 characters",
    "any.required": "Subcategory is required",
  }),
  name: Joi.string().trim().max(200).required().messages({
    "string.max": "Package name cannot exceed 200 characters",
    "any.required": "Package name is required",
  }),
  duration: Joi.string().max(50).required().messages({
    "string.max": "Duration cannot exceed 50 characters",
    "any.required": "Duration is required",
  }),
  price: Joi.string().max(50).required().messages({
    "string.max": "Price cannot exceed 50 characters",
    "any.required": "Price is required",
  }),
  numericPrice: Joi.number().min(0).default(0).messages({
    "number.min": "Price cannot be negative",
  }),
  rating: Joi.number().min(0).max(5).default(4.5).messages({
    "number.min": "Rating cannot be below 0",
    "number.max": "Rating cannot exceed 5",
  }),
  reviews: Joi.number().min(0).default(0),
  image: Joi.string().max(500).allow("", null).optional().messages({
    "string.max": "Image URL cannot exceed 500 characters",
  }),
  description: Joi.string().max(2000).required().messages({
    "string.max": "Description cannot exceed 2000 characters",
    "any.required": "Description is required",
  }),
  highlights: Joi.array().items(Joi.string().max(200)).max(20).default([]).messages({
    "array.max": "Cannot have more than 20 highlights",
  }),
  location: Joi.string().max(200).required().messages({
    "string.max": "Location cannot exceed 200 characters",
    "any.required": "Location is required",
  }),
  visa: Joi.string().max(100).default("Not Required"),
  isActive: Joi.boolean().default(true),
});

const updatePackageSchema = packageSchema.fork(
  ["category", "subcategory", "name", "duration", "price", "description", "location"],
  (schema) => schema.optional()
);

// Validation middleware
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const errors = error.details.map((d) => ({
      field: d.path.join("."),
      message: d.message,
    }));
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }
  req.body = value;
  next();
};

// ─── Multer config (memory storage for Cloudinary) ───
const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  if (extOk && mimeOk) return cb(null, true);
  cb(
    new multer.MulterError(
      "LIMIT_UNEXPECTED_FILE",
      "Only image files (JPEG, PNG, WebP, GIF) are allowed"
    )
  );
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter,
});

// ─── Upload package image to Cloudinary ───
router.post("/upload-image", auth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }
    const result = await uploadImage(req.file.buffer, "satyam-holidays/packages");
    res.json({ success: true, imageUrl: result.url });
  } catch (error) {
    logger.error("Image upload error:", error);
    res.status(500).json({ success: false, message: "Failed to upload image" });
  }
});

// Multer error handler
router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: "Image must be less than 5MB" });
    }
    return res.status(400).json({ success: false, message: err.message || "Invalid file" });
  }
  next(err);
});

// Import pagination utility
const { parsePaginationParams, buildPaginationMeta } = require("../utils/pagination");

// Get all packages
router.get("/", async (req, res) => {
  try {
    const { category, subcategory } = req.query;
    const { page, limit } = parsePaginationParams(req.query);

    const options = { category, subcategory, limit, page };
    const result = await packageService.getPackages(options);

    res.json({
      success: true,
      data: result.data,
      pagination: buildPaginationMeta(page, limit, result.pagination.totalItems),
    });
  } catch (error) {
    logger.error("Get packages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch packages",
    });
  }
});

// Get package categories (place before dynamic routes)
router.get("/categories/list", async (req, res) => {
  try {
    const categories = await packageService.getPackageCategories();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logger.error("Get categories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
});

// Get package statistics (must be before /:id to avoid matching "stats" as an ID)
router.get("/stats/overview", async (req, res) => {
  try {
    const stats = await packageService.getPackageStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("Package stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch package statistics",
    });
  }
});

// Get package by ID (after all specific routes)
router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }
  try {
    const pkg = await packageService.getPackageById(req.params.id);

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    res.json({
      success: true,
      data: pkg,
    });
  } catch (error) {
    logger.error("Get package error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch package",
    });
  }
});

// Create package
router.post("/", auth, validate(packageSchema), async (req, res) => {
  try {
    const pkg = await packageService.createPackage(req.body);
    await cacheService.invalidatePackages();
    res.status(201).json({
      success: true,
      data: pkg,
    });
  } catch (error) {
    logger.error("Create package error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create package",
    });
  }
});

// Update package
router.put("/:id", auth, validate(updatePackageSchema), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }
  try {
    const pkg = await packageService.updatePackage(req.params.id, req.body);
    if (!pkg) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }
    await cacheService.invalidatePackages();
    res.json({
      success: true,
      data: pkg,
    });
  } catch (error) {
    logger.error("Update package error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update package",
    });
  }
});

// Delete package
router.delete("/:id", auth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }
  try {
    const pkg = await packageService.deletePackage(req.params.id);
    if (!pkg) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }
    await cacheService.invalidatePackages();
    res.json({
      success: true,
      message: "Package deleted successfully",
    });
  } catch (error) {
    logger.error("Delete package error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete package",
    });
  }
});

module.exports = router;
