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
const { ApiErrors, successResponse, errorResponse } = require("../utils/apiResponse");
const { logAudit } = require("../utils/auditLogger");

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
    return errorResponse(res, ApiErrors.validationError(errors), req.id);
  }
  req.body = value;
  next();
};

// ─── Multer config (memory storage for Cloudinary) ───
const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/i;
  const extOk = allowed.test(path.extname(file.originalname));
  const mimeOk = allowed.test(file.mimetype);
  if (extOk && mimeOk) return cb(null, true);

  const err = new Error("Only image files (JPEG, PNG, WebP, GIF) are allowed");
  err.statusCode = 400;
  cb(err);
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
      return errorResponse(res, ApiErrors.badRequest("No image file provided"), req.id);
    }
    const result = await uploadImage(req.file.buffer, "satyam-holidays/packages");
    return res.status(200).json({ success: true, imageUrl: result.url });
  } catch (error) {
    logger.error("Image upload error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to upload image"), req.id);
  }
});

// Multer error handler
router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: "Image must be less than 5MB" });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res
        .status(400)
        .json({
          success: false,
          message: "Unexpected field name in upload. Expected field name is 'image'.",
        });
    }
    return res.status(400).json({ success: false, message: err.message || "Invalid file" });
  }
  if (err.message && err.message.includes("Only image files")) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
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

    res.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
    res.json({
      success: true,
      data: result.data,
      pagination: buildPaginationMeta(page, limit, result.pagination.totalItems),
    });
  } catch (error) {
    logger.error("Get packages error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to fetch packages"), req.id);
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
    return errorResponse(res, ApiErrors.internal("Failed to fetch categories"), req.id);
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
    return errorResponse(res, ApiErrors.internal("Failed to fetch package statistics"), req.id);
  }
});

// Get package by ID (after all specific routes)
router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return errorResponse(res, ApiErrors.badRequest("Invalid ID format"), req.id);
  }
  try {
    const pkg = await packageService.getPackageById(req.params.id);

    if (!pkg) {
      return errorResponse(res, ApiErrors.notFound("Package"), req.id);
    }

    res.set("Cache-Control", "public, s-maxage=600, stale-while-revalidate=120");
    return successResponse(res, pkg);
  } catch (error) {
    logger.error("Get package error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to fetch package"), req.id);
  }
});

// Create package
router.post("/", auth, validate(packageSchema), async (req, res) => {
  try {
    const pkg = await packageService.createPackage(req.body);
    await cacheService.invalidatePackages();
    logAudit(req, "CREATE", "package", pkg._id || pkg.id, { name: pkg.name });
    return successResponse(res, pkg, 201);
  } catch (error) {
    logger.error("Create package error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to create package"), req.id);
  }
});

// Update package
router.put("/:id", auth, validate(updatePackageSchema), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return errorResponse(res, ApiErrors.badRequest("Invalid ID format"), req.id);
  }
  try {
    const pkg = await packageService.updatePackage(req.params.id, req.body);
    if (!pkg) {
      return errorResponse(res, ApiErrors.notFound("Package"), req.id);
    }
    await cacheService.invalidatePackages();
    logAudit(req, "UPDATE", "package", req.params.id, req.body);
    return successResponse(res, pkg);
  } catch (error) {
    logger.error("Update package error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to update package"), req.id);
  }
});

// Delete package
router.delete("/:id", auth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return errorResponse(res, ApiErrors.badRequest("Invalid ID format"), req.id);
  }
  try {
    const pkg = await packageService.deletePackage(req.params.id);
    if (!pkg) {
      return errorResponse(res, ApiErrors.notFound("Package"), req.id);
    }
    await cacheService.invalidatePackages();
    logAudit(req, "DELETE", "package", req.params.id, { name: pkg.name });
    return successResponse(res, null, 200, { message: "Package deleted successfully" });
  } catch (error) {
    logger.error("Delete package error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to delete package"), req.id);
  }
});

// GET /api/v1/packages/slug/:slug — fetch package details by its unique URL slug or MongoDB ID
router.get("/slug/:slug", async (req, res) => {
  try {
    const Package = require("../models/Package");
    const query = mongoose.isValidObjectId(req.params.slug)
      ? { $or: [{ _id: req.params.slug }, { slug: req.params.slug }], isActive: true }
      : { slug: req.params.slug, isActive: true };

    const pkg = await Package.findOne(query).lean();
    if (!pkg) {
      return errorResponse(res, ApiErrors.notFound("Package"), req.id);
    }
    pkg.id = pkg._id;
    res.set("Cache-Control", "public, s-maxage=600, stale-while-revalidate=120");
    return successResponse(res, pkg);
  } catch (error) {
    logger.error("Get package by slug error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to fetch package"), req.id);
  }
});

// POST /api/v1/packages/:id/calculate-price — calculate dynamic total price based on date, discount code and travelers
router.post("/:id/calculate-price", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return errorResponse(res, ApiErrors.badRequest("Invalid ID format"), req.id);
  }
  try {
    const Package = require("../models/Package");
    const pkg = await Package.findById(req.params.id).lean();
    if (!pkg) {
      return errorResponse(res, ApiErrors.notFound("Package"), req.id);
    }

    const { date, travelersCount = 2, promoCode } = req.body;
    const count = parseInt(travelersCount) || 1;

    let unitPrice = pkg.numericPrice || parseFloat(pkg.price?.replace(/[^\d]/g, "") || "0");
    let dateInfo = null;

    if (date && pkg.availableDates && pkg.availableDates.length > 0) {
      const targetDate = new Date(date).toDateString();
      dateInfo = pkg.availableDates.find(
        (d) => new Date(d.startDate).toDateString() === targetDate
      );
      if (dateInfo && dateInfo.priceOverride) {
        unitPrice = dateInfo.priceOverride;
      }
    }

    const originalTotalPrice = unitPrice * count;
    let discountAmount = 0;
    let promoApplied = false;
    let discountPercent = 0;

    if (promoCode && pkg.promotions && pkg.promotions.length > 0) {
      const targetCode = String(promoCode).trim().toUpperCase();
      const promo = pkg.promotions.find((p) => p.code === targetCode);
      if (promo) {
        const now = new Date();
        const validFrom = promo.validFrom ? new Date(promo.validFrom) : null;
        const validUntil = promo.validUntil ? new Date(promo.validUntil) : null;

        const isValid = (!validFrom || now >= validFrom) && (!validUntil || now <= validUntil);
        if (isValid) {
          discountPercent = promo.discountPercent || 0;
          discountAmount = Math.round(originalTotalPrice * (discountPercent / 100));
          promoApplied = true;
        }
      }
    }

    const finalTotalPrice = originalTotalPrice - discountAmount;

    return successResponse(res, {
      unitPrice,
      originalTotalPrice,
      discountAmount,
      finalTotalPrice,
      promoApplied,
      discountPercent,
      dateMatched: !!dateInfo,
    });
  } catch (error) {
    logger.error("Price calculation error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to calculate price"), req.id);
  }
});

module.exports = router;
