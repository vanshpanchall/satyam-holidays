const express = require("express");
const router = express.Router();
const reviewService = require("../services/reviewService");
const auth = require("../middleware/auth");
const { body, param, query, validationResult } = require("express-validator");
const logger = require("../utils/logger");
const { parsePaginationParams, buildPaginationMeta } = require("../utils/pagination");
const rateLimit = require("express-rate-limit");
const rateLimiterStore = require("../middleware/rateLimiterStore");
const { ApiErrors, successResponse, errorResponse } = require("../utils/apiResponse");
const { logAudit } = require("../utils/auditLogger");

const postReviewLimiter = rateLimit({
  store: new rateLimiterStore.DistributedRateLimitStore("rl:reviews:post:"),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 reviews per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many reviews submitted from this IP. Please try again in an hour.",
  },
});

const patchHelpfulLimiter = rateLimit({
  store: new rateLimiterStore.DistributedRateLimitStore("rl:reviews:helpful:"),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 helpful votes per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many helpful votes from this IP. Please try again in an hour.",
  },
});

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
    return errorResponse(res, ApiErrors.validationError(errors.array()), req.id);
  }
  next();
};

// Create a new review
router.post("/", postReviewLimiter, validateReview, handleValidationErrors, async (req, res) => {
  try {
    const reviewData = {
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    };

    const review = await reviewService.createReview(reviewData);
    const msg =
      review.status === "approved"
        ? "Review submitted successfully"
        : "Review submitted and pending administrator approval";

    return successResponse(res, review.getSummary(), 201, { message: msg });
  } catch (error) {
    logger.error("Error creating review:", error);
    return errorResponse(
      res,
      ApiErrors.internal(error.message || "Failed to submit review"),
      req.id
    );
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

    res.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=30");
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
    return errorResponse(
      res,
      ApiErrors.internal(error.message || "Failed to fetch reviews"),
      req.id
    );
  }
});

// Get review summary for a package
router.get("/package/:packageId/summary", async (req, res) => {
  try {
    const { packageId } = req.params;
    const summary = await reviewService.getReviewSummary(packageId);

    res.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error("Error fetching review summary:", error);
    return errorResponse(
      res,
      ApiErrors.internal(error.message || "Failed to fetch review summary"),
      req.id
    );
  }
});

// Mark review as helpful
router.patch(
  "/:reviewId/helpful",
  patchHelpfulLimiter,
  [param("reviewId").isMongoId().withMessage("Invalid review ID")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { reviewId } = req.params;
      const helpfulCount = await reviewService.markHelpful(reviewId);

      return successResponse(res, { helpful: helpfulCount }, 200, {
        message: "Review marked as helpful",
      });
    } catch (error) {
      logger.error("Error marking review as helpful:", error);
      return errorResponse(
        res,
        ApiErrors.internal(error.message || "Failed to mark review as helpful"),
        req.id
      );
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

      logAudit(req, "VERIFY", "review", reviewId);
      return successResponse(res, review.getSummary(), 200, {
        message: "Review verified successfully",
      });
    } catch (error) {
      logger.error("Error verifying review:", error);
      return errorResponse(
        res,
        ApiErrors.internal(error.message || "Failed to verify review"),
        req.id
      );
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

      logAudit(req, "DELETE", "review", reviewId);
      return successResponse(res, null, 200, { message: "Review deleted successfully" });
    } catch (error) {
      logger.error("Error deleting review:", error);
      return errorResponse(
        res,
        ApiErrors.internal(error.message || "Failed to delete review"),
        req.id
      );
    }
  }
);

// Get all reviews (admin only)
router.get("/", auth, validatePagination, handleValidationErrors, async (req, res) => {
  try {
    const { page, limit } = parsePaginationParams(req.query);
    const { packageId, verified, rating, status } = req.query;
    const filter = {};

    if (packageId) filter.packageId = packageId;
    if (verified !== undefined) filter.verified = verified === "true";
    if (rating) filter.rating = parseInt(rating);
    if (status) filter.status = status;

    const result = await reviewService.getAllReviews(page, limit, filter);

    res.json({
      success: true,
      data: result.reviews,
      pagination: buildPaginationMeta(page, limit, result.pagination.totalReviews),
    });
  } catch (error) {
    logger.error("Error fetching all reviews:", error);
    return errorResponse(
      res,
      ApiErrors.internal(error.message || "Failed to fetch reviews"),
      req.id
    );
  }
});

// Update review status (admin only)
router.put(
  "/:reviewId/status",
  auth,
  [
    param("reviewId").isMongoId().withMessage("Invalid review ID"),
    body("status")
      .isIn(["pending", "approved", "rejected", "spam"])
      .withMessage("Invalid status value"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { reviewId } = req.params;
      const { status } = req.body;
      const review = await reviewService.updateStatus(reviewId, status);

      logAudit(req, `STATUS_${status.toUpperCase()}`, "review", reviewId);
      return successResponse(res, review.getSummary(), 200, {
        message: `Review status updated to ${status}`,
      });
    } catch (error) {
      logger.error("Error updating review status:", error);
      return errorResponse(
        res,
        ApiErrors.internal(error.message || "Failed to update review status"),
        req.id
      );
    }
  }
);

module.exports = router;
