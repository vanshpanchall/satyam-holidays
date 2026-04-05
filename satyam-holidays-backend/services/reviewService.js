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
        .select("-ipAddress -userAgent")
        .lean(); // Use lean() for read-only operations

      const total = await Review.countDocuments({ packageId });
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

      // Use aggregation for better performance instead of fetching all reviews
      const result = await Review.aggregate([
        { $match: { packageId: new (require("mongoose").Types.ObjectId)(packageId) } },
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
