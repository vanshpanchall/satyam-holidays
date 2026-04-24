import { useState, useEffect, useCallback } from "react";
import { FaStar, FaThumbsUp, FaUser, FaCalendarAlt, FaCheckCircle } from "react-icons/fa";
import { toast } from "react-toastify";
import { apiUrl, fetchWithAuth } from "../config/siteConfig";

const ReviewCard = ({ review, onHelpfulClick }) => {
  const [isHelpfulLoading, setIsHelpfulLoading] = useState(false);

  const handleHelpfulClick = async () => {
    setIsHelpfulLoading(true);
    try {
      await onHelpfulClick(review.id);
    } catch {
      // Error handled silently
    } finally {
      setIsHelpfulLoading(false);
    }
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <FaStar key={i} className={`w-4 h-4 ${i < rating ? "text-yellow-400" : "text-gray-300"}`} />
    ));
  };

  return (
    <div className="glass-card rounded-2xl p-6 hover:shadow-glass transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 dark:bg-navy-700 rounded-full flex items-center justify-center">
            <FaUser className="text-primary-500 dark:text-primary-400 w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="font-semibold text-gray-800 dark:text-white">{review.name}</h4>
              {review.verified && (
                <div className="flex items-center text-green-600 dark:text-green-400 text-sm">
                  <FaCheckCircle className="w-4 h-4 mr-1" />
                  <span>Verified</span>
                </div>
              )}
            </div>
            <div className="flex items-center text-gray-500 dark:text-navy-300 text-sm">
              <FaCalendarAlt className="w-3 h-3 mr-1" />
              <span>{review.formattedDate || review.createdAt || ""}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">{renderStars(review.rating)}</div>
      </div>

      {/* Title */}
      {review.title && (
        <h5 className="font-medium text-gray-800 dark:text-white mb-2">{review.title}</h5>
      )}

      {/* Comment */}
      <p className="text-gray-700 dark:text-navy-200 mb-4 leading-relaxed">{review.comment}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleHelpfulClick}
          disabled={isHelpfulLoading}
          className="flex items-center space-x-2 text-gray-500 dark:text-navy-300 hover:text-primary-500 dark:hover:text-primary-400 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-navy-900 rounded"
          aria-label={`Mark review by ${review.name} as helpful`}
          aria-pressed="false"
        >
          <FaThumbsUp className="w-4 h-4" />
          <span className="text-sm">Helpful ({review.helpful || 0})</span>
        </button>
      </div>
    </div>
  );
};

const ReviewList = ({ packageId }) => {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const defaultPagination = {
    currentPage: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  const parseReviewsPayload = (apiResponse) => {
    const payload = apiResponse?.data;

    // Supports both shapes:
    // 1) { data: { reviews: [...], pagination: {...} } }
    // 2) { data: [...], pagination: {...} }
    if (Array.isArray(payload)) {
      return {
        reviews: payload,
        pagination: apiResponse?.pagination || defaultPagination,
      };
    }

    if (payload && Array.isArray(payload.reviews)) {
      return {
        reviews: payload.reviews,
        pagination: payload.pagination || apiResponse?.pagination || defaultPagination,
      };
    }

    return {
      reviews: [],
      pagination: apiResponse?.pagination || defaultPagination,
    };
  };

  const parseSummaryPayload = (apiResponse) => {
    const raw = apiResponse?.data || {};
    const averageRatingValue = Number(raw.averageRating);
    const distribution = raw.ratingDistribution || {};

    return {
      totalReviews: Number(raw.totalReviews) || 0,
      averageRating: Number.isFinite(averageRatingValue) ? averageRatingValue : 0,
      ratingDistribution: {
        1: Number(distribution[1]) || 0,
        2: Number(distribution[2]) || 0,
        3: Number(distribution[3]) || 0,
        4: Number(distribution[4]) || 0,
        5: Number(distribution[5]) || 0,
      },
      verifiedReviews: Number(raw.verifiedReviews) || 0,
    };
  };

  const [page, setPage] = useState(1);

  const handleHelpfulClick = async (reviewId) => {
    try {
      const response = await fetchWithAuth(apiUrl(`/api/reviews/${reviewId}/helpful`), {
        method: "PATCH",
      });

      const data = await response.json();

      if (data.success) {
        // Update the review in the local state
        setReviews((prevReviews) =>
          (Array.isArray(prevReviews) ? prevReviews : []).map((review) =>
            review.id === reviewId ? { ...review, helpful: data.data.helpful } : review
          )
        );
        toast.success("Thank you for your feedback!");
      } else {
        throw new Error(data.message || "Failed to mark as helpful");
      }
    } catch (error) {
      toast.error("Failed to mark review as helpful");
    }
  };

  const handleSortChange = (newSortBy) => {
    const newSortOrder = sortBy === newSortBy && sortOrder === "desc" ? "asc" : "desc";
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1); // Reset page on sort change
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  useEffect(() => {
    if (!packageId) return;
    const controller = new AbortController();

    const fetchReviews = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          apiUrl(
            `/api/reviews/package/${packageId}?page=${page}&limit=5&sortBy=${sortBy}&sortOrder=${sortOrder}`
          ),
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch reviews");
        }

        const data = await response.json();

        if (data.success) {
          const parsed = parseReviewsPayload(data);
          setReviews(parsed.reviews);
          setPagination(parsed.pagination);
        } else {
          throw new Error(data.message || "Failed to fetch reviews");
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          setError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    const fetchSummary = async () => {
      try {
        const response = await fetch(apiUrl(`/api/reviews/package/${packageId}/summary`), {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch review summary");
        }

        const data = await response.json();

        if (data.success) {
          setSummary(parseSummaryPayload(data));
        }
      } catch (error) {
        // Summary fetch error handled silently
      }
    };

    fetchSummary();
    fetchReviews();

    return () => {
      controller.abort();
    };
  }, [packageId, sortBy, sortOrder, page]);

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <FaStar key={i} className={`w-5 h-5 ${i < rating ? "text-yellow-400" : "text-gray-300"}`} />
    ));
  };

  const renderRatingDistribution = () => {
    if (!summary) return null;

    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = summary.ratingDistribution[rating] || 0;
          const percentage = summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0;

          return (
            <div key={rating} className="flex items-center space-x-2">
              <span className="text-sm w-8">{rating}</span>
              <FaStar className="text-yellow-400 w-4 h-4" />
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-600 w-8">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading && !summary) {
    // Skeleton for summary and a few review cards
    return (
      <div className="space-y-6 animate-pulse" aria-busy="true" aria-live="polite">
        <div className="glass-card rounded-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <div className="mx-auto h-8 w-24 bg-gray-200 dark:bg-navy-700 rounded mb-2"></div>
              <div className="mx-auto h-5 w-40 bg-gray-200 dark:bg-navy-700 rounded mb-2"></div>
              <div className="mx-auto h-4 w-56 bg-gray-200 dark:bg-navy-700 rounded"></div>
            </div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <div className="h-4 w-8 bg-gray-200 dark:bg-navy-700 rounded"></div>
                  <div className="h-4 w-4 bg-gray-200 dark:bg-navy-700 rounded"></div>
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-navy-700 rounded"></div>
                  <div className="h-4 w-8 bg-gray-200 dark:bg-navy-700 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-navy-700 rounded-full"></div>
                <div>
                  <div className="h-4 w-32 bg-gray-200 dark:bg-navy-700 rounded mb-2"></div>
                  <div className="h-3 w-24 bg-gray-200 dark:bg-navy-700 rounded"></div>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="w-4 h-4 bg-gray-200 dark:bg-navy-700 rounded"></div>
                ))}
              </div>
            </div>
            <div className="h-4 w-40 bg-gray-200 dark:bg-navy-700 rounded mb-2"></div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-gray-200 dark:bg-navy-700 rounded"></div>
              <div className="h-3 w-11/12 bg-gray-200 dark:bg-navy-700 rounded"></div>
              <div className="h-3 w-10/12 bg-gray-200 dark:bg-navy-700 rounded"></div>
            </div>
            <div className="mt-4 h-6 w-24 bg-gray-200 dark:bg-navy-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {summary && (
        <div className="glass-card rounded-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall Rating */}
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
                {Number(summary.averageRating || 0).toFixed(1)}
              </div>
              <div className="flex justify-center mb-2">
                {renderStars(Math.round(summary.averageRating || 0))}
              </div>
              <p className="text-gray-600 dark:text-navy-300">
                Based on {summary.totalReviews || 0} review
                {(summary.totalReviews || 0) !== 1 ? "s" : ""}
              </p>
              {(summary.verifiedReviews || 0) > 0 && (
                <p className="text-green-600 text-sm mt-1">
                  {summary.verifiedReviews || 0} verified review
                  {(summary.verifiedReviews || 0) !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            {/* Rating Distribution */}
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white mb-3">Rating Breakdown</h4>
              {renderRatingDistribution()}
            </div>
          </div>
        </div>
      )}

      {/* Sort Controls */}
      {Array.isArray(reviews) && reviews.length > 0 && (
        <div className="flex flex-wrap items-center justify-between glass-card rounded-2xl p-4">
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 dark:text-navy-200 font-medium">Sort by:</span>
            <button
              onClick={() => handleSortChange("createdAt")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-navy-900 ${
                sortBy === "createdAt"
                  ? "bg-primary-500 text-white"
                  : "bg-gray-100 dark:bg-navy-700 text-gray-700 dark:text-navy-200 hover:bg-gray-200 dark:hover:bg-navy-600"
              }`}
              aria-pressed={sortBy === "createdAt"}
              aria-label={`Sort by date ${sortBy === "createdAt" ? "(active)" : ""}`}
            >
              Date {sortBy === "createdAt" && (sortOrder === "desc" ? "↓" : "↑")}
            </button>
            <button
              onClick={() => handleSortChange("rating")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-navy-900 ${
                sortBy === "rating"
                  ? "bg-primary-500 text-white"
                  : "bg-gray-100 dark:bg-navy-700 text-gray-700 dark:text-navy-200 hover:bg-gray-200 dark:hover:bg-navy-600"
              }`}
              aria-pressed={sortBy === "rating"}
              aria-label={`Sort by rating ${sortBy === "rating" ? "(active)" : ""}`}
            >
              Rating {sortBy === "rating" && (sortOrder === "desc" ? "↓" : "↑")}
            </button>
            <button
              onClick={() => handleSortChange("helpful")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-navy-900 ${
                sortBy === "helpful"
                  ? "bg-primary-500 text-white"
                  : "bg-gray-100 dark:bg-navy-700 text-gray-700 dark:text-navy-200 hover:bg-gray-200 dark:hover:bg-navy-600"
              }`}
              aria-pressed={sortBy === "helpful"}
              aria-label={`Sort by helpful ${sortBy === "helpful" ? "(active)" : ""}`}
            >
              Helpful {sortBy === "helpful" && (sortOrder === "desc" ? "↓" : "↑")}
            </button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-12 glass-card rounded-2xl">
            <FaStar className="mx-auto w-12 h-12 text-gray-300 dark:text-navy-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
              No reviews yet
            </h3>
            <p className="text-gray-600 dark:text-navy-300">Be the first to review this package!</p>
          </div>
        ) : (
          (Array.isArray(reviews) ? reviews : []).map((review) => (
            <ReviewCard key={review.id} review={review} onHelpfulClick={handleHelpfulClick} />
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-8">
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrev}
            className="px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-md text-gray-700 dark:text-navy-200 hover:bg-gray-50 dark:hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-navy-900"
            aria-label="Go to previous page"
          >
            Previous
          </button>

          <div className="flex space-x-1">
            {[...Array(pagination.totalPages)].map((_, i) => {
              const page = i + 1;
              const isCurrentPage = page === pagination.currentPage;

              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 border rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-navy-900 ${
                    isCurrentPage
                      ? "bg-primary-500 text-white border-primary-500"
                      : "border-gray-300 dark:border-navy-600 text-gray-700 dark:text-navy-200 hover:bg-gray-50 dark:hover:bg-navy-700"
                  }`}
                  aria-current={isCurrentPage ? "page" : undefined}
                  aria-label={`Go to page ${page}${isCurrentPage ? ", current page" : ""}`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNext}
            className="px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-md text-gray-700 dark:text-navy-200 hover:bg-gray-50 dark:hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-navy-900"
            aria-label="Go to next page"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewList;
