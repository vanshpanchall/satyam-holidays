const Review = require("../models/Review");
const cache = require("../utils/cache");
const logger = require("../utils/logger");

function detectSpam(text) {
  if (!text) return { isSpam: false, score: 0 };
  const spamKeywords = [
    "crypto",
    "bitcoin",
    "casino",
    "viagra",
    "cialis",
    "poker",
    "lottery",
    "earn money",
    "make money",
    "work from home",
    "essay writer",
    "payday loan",
    "replica watch",
    "cheap software",
    "seo service",
    "buy traffic",
    "free discount",
  ];
  const lowerText = text.toLowerCase();
  let matches = 0;
  for (const keyword of spamKeywords) {
    if (lowerText.includes(keyword)) {
      matches++;
    }
  }

  const urlCount = (lowerText.match(/https?:\/\/[^\s]+/g) || []).length;
  const htmlCount = (lowerText.match(/<\s*[^>]*>/g) || []).length;

  const score = matches * 30 + urlCount * 40 + htmlCount * 50;
  return {
    isSpam: score >= 50,
    score: Math.min(100, score),
  };
}

class ReviewService {
  // Create a new review (with 24h deduplication cooldown and spam filtering)
  async createReview(reviewData) {
    try {
      logger.info("Service: createReview invoked", {
        packageId: reviewData.packageId,
        email: reviewData.email,
      });

      // 24-hour deduplication: prevent the same email from reviewing the same package twice within 24h
      const cooldownMs = 24 * 60 * 60 * 1000;
      const cutoff = new Date(Date.now() - cooldownMs);
      const existing = await Review.findOne({
        email: reviewData.email?.toLowerCase(),
        packageId: reviewData.packageId,
        createdAt: { $gte: cutoff },
      }).lean();

      if (existing) {
        logger.warn("Service: createReview blocked by 24h cooldown", {
          email: reviewData.email,
          packageId: reviewData.packageId,
        });
        const err = new Error(
          "You have already reviewed this package in the last 24 hours. Please try again later."
        );
        err.statusCode = 429;
        throw err;
      }

      const spamAnalysis = detectSpam((reviewData.title || "") + " " + (reviewData.comment || ""));
      logger.info("Service: createReview spam analysis completed", {
        score: spamAnalysis.score,
        isSpam: spamAnalysis.isSpam,
      });

      const review = new Review({
        ...reviewData,
        spamScore: spamAnalysis.score,
        status: spamAnalysis.isSpam ? "spam" : "pending",
      });
      await review.save();
      logger.info("Service: createReview document saved successfully", {
        id: review._id,
        status: review.status,
      });

      // Clear cache for this package's reviews
      if (cache.invalidatePattern) {
        await cache.invalidatePattern(`reviews:${reviewData.packageId}:*`);
      } else {
        await cache.del(`reviews:${reviewData.packageId}`);
      }
      await cache.del(`reviews:summary:${reviewData.packageId}`);
      logger.info("Service: createReview cleared cache namespaces", {
        packageId: reviewData.packageId,
      });

      return review;
    } catch (error) {
      throw error.statusCode ? error : new Error(`Failed to create review: ${error.message}`);
    }
  }

  // Get reviews for a package with pagination (approved reviews only)
  async getReviews(packageId, page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc") {
    try {
      logger.info("Service: getReviews invoked", { packageId, page, limit, sortBy, sortOrder });
      const cacheKey = `reviews:${packageId}:${page}:${limit}:${sortBy}:${sortOrder}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        logger.info("Service: getReviews cache HIT", { cacheKey });
        return cached;
      }

      logger.info("Service: getReviews cache MISS. Querying database...", { cacheKey });
      const skip = (page - 1) * limit;
      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      const reviews = await Review.find({ packageId, status: "approved" })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select("-ipAddress -userAgent")
        .lean();

      const total = await Review.countDocuments({ packageId, status: "approved" });
      const totalPages = Math.ceil(total / limit);

      // Transform reviews for response
      const transformedReviews = reviews.map((review) => ({
        id: review._id,
        name: review.name,
        rating: review.rating,
        comment: review.comment,
        verified: review.verified,
        helpful: review.helpful,
        createdAt: review.createdAt,
        formattedDate: new Date(review.createdAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      }));

      const result = {
        reviews: transformedReviews,
        pagination: {
          currentPage: page,
          totalPages,
          totalReviews: total,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };

      await cache.set(cacheKey, result, 300); // Cache for 5 minutes
      logger.info("Service: getReviews cached new result", { cacheKey });
      return result;
    } catch (error) {
      throw new Error(`Failed to get reviews: ${error.message}`);
    }
  }

  // Get review summary for a package (approved reviews only)
  async getReviewSummary(packageId) {
    try {
      logger.info("Service: getReviewSummary invoked", { packageId });
      const cacheKey = `reviews:summary:${packageId}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        logger.info("Service: getReviewSummary cache HIT", { cacheKey });
        return cached;
      }

      logger.info("Service: getReviewSummary cache MISS. Querying database...", { cacheKey });
      // Use aggregation for better performance instead of fetching all reviews
      const result = await Review.aggregate([
        {
          $match: {
            packageId: new (require("mongoose").Types.ObjectId)(packageId),
            status: "approved",
          },
        },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            avgRating: { $avg: "$rating" },
            verifiedCount: { $sum: { $cond: ["$verified", 1, 0] } },
            rating1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
            rating2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
            rating3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
            rating4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
            rating5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          },
        },
      ]);

      const data = result[0];
      const summary = data
        ? {
            totalReviews: data.totalReviews,
            averageRating: Math.round(data.avgRating * 10) / 10,
            ratingDistribution: {
              1: data.rating1,
              2: data.rating2,
              3: data.rating3,
              4: data.rating4,
              5: data.rating5,
            },
            verifiedReviews: data.verifiedCount,
          }
        : {
            totalReviews: 0,
            averageRating: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            verifiedReviews: 0,
          };

      await cache.set(cacheKey, summary, 600); // Cache for 10 minutes
      logger.info("Service: getReviewSummary cached new summary", { cacheKey });
      return summary;
    } catch (error) {
      throw new Error(`Failed to get review summary: ${error.message}`);
    }
  }

  // Update review helpful count
  async markHelpful(reviewId) {
    try {
      logger.info("Service: markHelpful invoked", { reviewId });
      const review = await Review.findByIdAndUpdate(
        reviewId,
        { $inc: { helpful: 1 } },
        { new: true }
      );

      if (!review) {
        logger.warn("Service: markHelpful review not found", { reviewId });
        throw new Error("Review not found");
      }

      // Clear cache for this package
      if (cache.invalidatePattern) {
        await cache.invalidatePattern(`reviews:${review.packageId}:*`);
      } else {
        await cache.del(`reviews:${review.packageId}`);
      }
      await cache.del(`reviews:summary:${review.packageId}`);
      logger.info("Service: markHelpful succeeded and cleared caches", {
        reviewId,
        packageId: review.packageId,
      });

      return review.helpful;
    } catch (error) {
      throw new Error(`Failed to mark review as helpful: ${error.message}`);
    }
  }

  // Verify a review (admin function)
  async verifyReview(reviewId) {
    try {
      logger.info("Service: verifyReview invoked", { reviewId });
      const review = await Review.findByIdAndUpdate(reviewId, { verified: true }, { new: true });

      if (!review) {
        logger.warn("Service: verifyReview review not found", { reviewId });
        throw new Error("Review not found");
      }

      // Clear cache for this package
      if (cache.invalidatePattern) {
        await cache.invalidatePattern(`reviews:${review.packageId}:*`);
      } else {
        await cache.del(`reviews:${review.packageId}`);
      }
      await cache.del(`reviews:summary:${review.packageId}`);
      logger.info("Service: verifyReview succeeded and cleared caches", {
        reviewId,
        packageId: review.packageId,
      });

      return review;
    } catch (error) {
      throw new Error(`Failed to verify review: ${error.message}`);
    }
  }

  // Delete a review
  async deleteReview(reviewId) {
    try {
      logger.info("Service: deleteReview invoked", { reviewId });
      const review = await Review.findByIdAndDelete(reviewId);

      if (!review) {
        logger.warn("Service: deleteReview review not found", { reviewId });
        throw new Error("Review not found");
      }

      // Clear cache for this package
      await cache.del(`reviews:${review.packageId}`);
      await cache.del(`reviews:summary:${review.packageId}`);
      logger.info("Service: deleteReview succeeded and cleared caches", {
        reviewId,
        packageId: review.packageId,
      });

      return review;
    } catch (error) {
      throw new Error(`Failed to delete review: ${error.message}`);
    }
  }

  // Get all reviews (admin function)
  async getAllReviews(page = 1, limit = 20, filter = {}) {
    try {
      logger.info("Service: getAllReviews invoked", { page, limit, filter });
      const skip = (page - 1) * limit;
      const query = {};

      if (filter.packageId) query.packageId = filter.packageId;
      if (filter.verified !== undefined) query.verified = filter.verified;
      if (filter.rating) query.rating = filter.rating;
      if (filter.status) query.status = filter.status;

      const reviews = await Review.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("packageId", "name");

      const total = await Review.countDocuments(query);
      const totalPages = Math.ceil(total / limit);

      return {
        reviews,
        pagination: {
          currentPage: page,
          totalPages,
          totalReviews: total,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get all reviews: ${error.message}`);
    }
  }

  // Update a review's moderation status (admin function)
  async updateStatus(reviewId, status) {
    try {
      logger.info("Service: updateStatus invoked", { reviewId, status });
      const review = await Review.findByIdAndUpdate(reviewId, { status }, { new: true });
      if (!review) {
        logger.warn("Service: updateStatus review not found", { reviewId });
        throw new Error("Review not found");
      }

      // Clear cache for this package
      if (cache.invalidatePattern) {
        await cache.invalidatePattern(`reviews:${review.packageId}:*`);
      } else {
        await cache.del(`reviews:${review.packageId}`);
      }
      await cache.del(`reviews:summary:${review.packageId}`);
      logger.info("Service: updateStatus succeeded and cleared caches", {
        reviewId,
        packageId: review.packageId,
      });

      return review;
    } catch (error) {
      throw new Error(`Failed to update review status: ${error.message}`);
    }
  }
}

module.exports = new ReviewService();
