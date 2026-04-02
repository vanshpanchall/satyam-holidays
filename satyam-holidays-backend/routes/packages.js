const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const packageService = require("../services/packageService");
const cacheService = require("../utils/cache");
const auth = require("../middleware/auth");
const logger = require("../utils/logger");
const { uploadImage } = require("../utils/cloudinary");

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

// Get all packages
router.get("/", async (req, res) => {
  try {
    const { category, subcategory, limit = 20, page = 1 } = req.query;

    const options = {
      category,
      subcategory,
      limit: parseInt(limit),
      page: parseInt(page),
    };

    const result = await packageService.getPackages(options);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
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
router.post("/", auth, async (req, res) => {
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
router.put("/:id", auth, async (req, res) => {
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
