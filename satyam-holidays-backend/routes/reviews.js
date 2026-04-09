const express = require("express");
const router = express.Router();
const reviewService = require("../services/reviewService");
const auth = require("../middleware/auth");
const { body, param, query, validationResult } = require("express-validator");
const logger = require("../utils/logger");
const { parsePaginationParams, buildPaginationMeta } = require("../utils/pagination");

// Validation middleware
const validateReview = [
  body("packageId").notEmpty().withMessage("Package ID is required"),
  body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Name must be 2-100 characters"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be 1-5"),
  body("title").optional().isLength({ max: 200 }).withMessage("Title cannot exceed 200 characters"),
  body("comment")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Comment must be 10-1000 characters"),
];

const validatePagination = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("Limit must be 1-50"),
  query("sortBy")
    .optional()
    .isIn(["createdAt", "rating", "helpful"])
    .withMessage("Invalid sort field"),
  query("sortOrder").optional().isIn(["asc", "desc"]).withMessage("Sort order must be asc or desc"),
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// Create a new review
router.post("/", validateReview, handleValidationErrors, async (req, res) => {
  try {
    const reviewData = {
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    };

    const review = await reviewService.createReview(reviewData);

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: review.getSummary(),
    });
  } catch (error) {
    logger.error("Error creating review:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to submit review",
    });
  }
});

// Get reviews for a package
router.get("/package/:packageId", validatePagination, handleValidationErrors, async (req, res) => {
  try {
    const { packageId } = req.params;
    const { page, limit } = parsePaginationParams(req.query);
    const { sortBy = "createdAt", sortOrder = "desc" } = req.query;

    const result = await reviewService.getReviews(packageId, page, limit, sortBy, sortOrder);
    const pagination = buildPaginationMeta(page, limit, result.pagination.totalReviews);

    res.json({
      success: true,
      data: {
        reviews: result.reviews,
        pagination,
      },
      // Keep top-level pagination for backward compatibility with existing clients.
      pagination,
    });
  } catch (error) {
    logger.error("Error fetching reviews:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch reviews",
    });
  }
});

// Get review summary for a package
router.get("/package/:packageId/summary", async (req, res) => {
  try {
    const { packageId } = req.params;
    const summary = await reviewService.getReviewSummary(packageId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error("Error fetching review summary:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch review summary",
    });
  }
});

// Mark review as helpful
router.patch(
  "/:reviewId/helpful",
  [param("reviewId").isMongoId().withMessage("Invalid review ID")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { reviewId } = req.params;
      const helpfulCount = await reviewService.markHelpful(reviewId);

      res.json({
        success: true,
        message: "Review marked as helpful",
        data: { helpful: helpfulCount },
      });
    } catch (error) {
      logger.error("Error marking review as helpful:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to mark review as helpful",
      });
    }
  }
);

// Verify review (admin only)
router.patch(
  "/:reviewId/verify",
  auth,
  [param("reviewId").isMongoId().withMessage("Invalid review ID")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { reviewId } = req.params;
      const review = await reviewService.verifyReview(reviewId);

      res.json({
        success: true,
        message: "Review verified successfully",
        data: review.getSummary(),
      });
    } catch (error) {
      logger.error("Error verifying review:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to verify review",
      });
    }
  }
);

// Delete review (admin only)
router.delete(
  "/:reviewId",
  auth,
  [param("reviewId").isMongoId().withMessage("Invalid review ID")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { reviewId } = req.params;
      await reviewService.deleteReview(reviewId);

      res.json({
        success: true,
        message: "Review deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting review:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete review",
      });
    }
  }
);

// Get all reviews (admin only)
router.get("/", auth, validatePagination, handleValidationErrors, async (req, res) => {
  try {
    const { page, limit } = parsePaginationParams(req.query);
    const { packageId, verified, rating } = req.query;
    const filter = {};

    if (packageId) filter.packageId = packageId;
    if (verified !== undefined) filter.verified = verified === "true";
    if (rating) filter.rating = parseInt(rating);

    const result = await reviewService.getAllReviews(page, limit, filter);

    res.json({
      success: true,
      data: result.reviews,
      pagination: buildPaginationMeta(page, limit, result.pagination.totalReviews),
    });
  } catch (error) {
    logger.error("Error fetching all reviews:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch reviews",
    });
  }
});

module.exports = router;
