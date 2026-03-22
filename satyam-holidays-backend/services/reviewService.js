const Review = require("../models/Review");
const cache = require("../utils/cache");

class ReviewService {
  // Create a new review
  async createReview(reviewData) {
    try {
      const review = new Review(reviewData);
      await review.save();

      // Clear cache for this package's reviews
      if (cache.invalidatePattern) {
        await cache.invalidatePattern(`reviews:${reviewData.packageId}:*`);
      } else {
        await cache.del(`reviews:${reviewData.packageId}`);
      }
      await cache.del(`reviews:summary:${reviewData.packageId}`);

      return review;
    } catch (error) {
      throw new Error(`Failed to create review: ${error.message}`);
    }
  }

  // Get reviews for a package with pagination
  async getReviews(packageId, page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc") {
    try {
      const cacheKey = `reviews:${packageId}:${page}:${limit}:${sortBy}:${sortOrder}`;
      const cached = await cache.get(cacheKey);
      if (cached) return cached;

      const skip = (page - 1) * limit;
      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      const reviews = await Review.find({ packageId })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select("-ipAddress -userAgent");

      const total = await Review.countDocuments({ packageId });
      const totalPages = Math.ceil(total / limit);

      const result = {
        reviews: reviews.map((review) => review.getSummary()),
        pagination: {
          currentPage: page,
          totalPages,
          totalReviews: total,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };

      await cache.set(cacheKey, result, 300); // Cache for 5 minutes
      return result;
    } catch (error) {
      throw new Error(`Failed to get reviews: ${error.message}`);
    }
  }

  // Get review summary for a package
  async getReviewSummary(packageId) {
    try {
      const cacheKey = `reviews:summary:${packageId}`;
      const cached = await cache.get(cacheKey);
      if (cached) return cached;

      const reviews = await Review.find({ packageId });

      if (reviews.length === 0) {
        const summary = {
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          verifiedReviews: 0,
        };
        await cache.set(cacheKey, summary, 600); // Cache for 10 minutes
        return summary;
      }

      const totalReviews = reviews.length;
      const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
      const verifiedReviews = reviews.filter((review) => review.verified).length;

      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      reviews.forEach((review) => {
        ratingDistribution[review.rating]++;
      });

      const summary = {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingDistribution,
        verifiedReviews,
      };

      await cache.set(cacheKey, summary, 600); // Cache for 10 minutes
      return summary;
    } catch (error) {
      throw new Error(`Failed to get review summary: ${error.message}`);
    }
  }

  // Update review helpful count
  async markHelpful(reviewId) {
    try {
      const review = await Review.findByIdAndUpdate(
        reviewId,
        { $inc: { helpful: 1 } },
        { new: true }
      );

      if (!review) {
        throw new Error("Review not found");
      }

      // Clear cache for this package
      if (cache.invalidatePattern) {
        await cache.invalidatePattern(`reviews:${review.packageId}:*`);
      } else {
        await cache.del(`reviews:${review.packageId}`);
      }
      await cache.del(`reviews:summary:${review.packageId}`);

      return review.helpful;
    } catch (error) {
      throw new Error(`Failed to mark review as helpful: ${error.message}`);
    }
  }

  // Verify a review (admin function)
  async verifyReview(reviewId) {
    try {
      const review = await Review.findByIdAndUpdate(reviewId, { verified: true }, { new: true });

      if (!review) {
        throw new Error("Review not found");
      }

      // Clear cache for this package
      if (cache.invalidatePattern) {
        await cache.invalidatePattern(`reviews:${review.packageId}:*`);
      } else {
        await cache.del(`reviews:${review.packageId}`);
      }
      await cache.del(`reviews:summary:${review.packageId}`);

      return review;
    } catch (error) {
      throw new Error(`Failed to verify review: ${error.message}`);
    }
  }

  // Delete a review
  async deleteReview(reviewId) {
    try {
      const review = await Review.findByIdAndDelete(reviewId);

      if (!review) {
        throw new Error("Review not found");
      }

      // Clear cache for this package
      await cache.del(`reviews:${review.packageId}`);
      await cache.del(`reviews:summary:${review.packageId}`);

      return review;
    } catch (error) {
      throw new Error(`Failed to delete review: ${error.message}`);
    }
  }

  // Get all reviews (admin function)
  async getAllReviews(page = 1, limit = 20, filter = {}) {
    try {
      const skip = (page - 1) * limit;
      const query = {};

      if (filter.packageId) query.packageId = filter.packageId;
      if (filter.verified !== undefined) query.verified = filter.verified;
      if (filter.rating) query.rating = filter.rating;

      const reviews = await Review.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("packageId", "title");

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
}

module.exports = new ReviewService();
