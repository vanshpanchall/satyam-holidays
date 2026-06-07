import { useState } from "react";
import { FaStar, FaUser, FaEnvelope, FaComment } from "react-icons/fa";
import { toast } from "react-toastify";
import { apiUrl, fetchWithAuth, toastApiError } from "../config/siteConfig";

const ReviewForm = ({ packageId, packageTitle, onReviewSubmitted }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    rating: 0,
    title: "",
    comment: "",
  });
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRatingClick = (rating) => {
    setFormData((prev) => ({
      ...prev,
      rating,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (!formData.email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    if (!formData.comment.trim()) {
      toast.error("Please enter your review comment");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetchWithAuth(apiUrl("/api/reviews"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          packageId,
        }),
      });

      const data = await response
        .json()
        .catch(() => ({ success: false, message: "Invalid server response" }));

      if (data.success) {
        toast.success("Thank you for your review!");
        setFormData({
          name: "",
          email: "",
          rating: 0,
          title: "",
          comment: "",
        });
        if (onReviewSubmitted) {
          onReviewSubmitted();
        }
      } else {
        toastApiError(data, "Failed to submit review");
      }
    } catch (err) {
      toastApiError(err, "Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Write a Review</h3>
        <p className="text-gray-600 dark:text-navy-300">
          Share your experience with <span className="font-semibold">{packageTitle}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-navy-200 mb-2">
            Rating *
          </label>
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleRatingClick(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
              >
                <FaStar
                  className={`w-8 h-8 ${
                    star <= (hoveredRating || formData.rating) ? "text-yellow-400" : "text-gray-300"
                  } transition-colors duration-150`}
                />
              </button>
            ))}
          </div>
          {formData.rating > 0 && (
            <p className="text-sm text-gray-600 dark:text-navy-300 mt-1">
              {formData.rating} star{formData.rating !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 dark:text-navy-200 mb-2"
          >
            Your Name *
          </label>
          <div className="relative">
            <FaUser className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full pl-10 pr-3 py-2.5 border border-navy-200 dark:border-navy-600 rounded-lg bg-white/80 dark:bg-navy-800/60 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              placeholder="Enter your full name"
              required
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-navy-200 mb-2"
          >
            Email Address *
          </label>
          <div className="relative">
            <FaEnvelope className="absolute left-3 top-3 text-gray-400" />
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full pl-10 pr-3 py-2.5 border border-navy-200 dark:border-navy-600 rounded-lg bg-white/80 dark:bg-navy-800/60 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              placeholder="Enter your email address"
              required
            />
          </div>
        </div>

        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 dark:text-navy-200 mb-2"
          >
            Review Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="w-full px-3 py-2.5 border border-navy-200 dark:border-navy-600 rounded-lg bg-white/80 dark:bg-navy-800/60 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
            placeholder="Summarize your experience (optional)"
            maxLength="200"
          />
        </div>

        {/* Comment */}
        <div>
          <label
            htmlFor="comment"
            className="block text-sm font-medium text-gray-700 dark:text-navy-200 mb-2"
          >
            Your Review *
          </label>
          <div className="relative">
            <FaComment className="absolute left-3 top-3 text-gray-400" />
            <textarea
              id="comment"
              name="comment"
              value={formData.comment}
              onChange={handleInputChange}
              rows="4"
              className="w-full pl-10 pr-3 py-2.5 border border-navy-200 dark:border-navy-600 rounded-lg bg-white/80 dark:bg-navy-800/60 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-vertical transition-colors"
              placeholder="Tell others about your experience with this package..."
              required
              minLength="10"
              maxLength="1000"
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">{formData.comment.length}/1000 characters</p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full btn btn-primary min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Submitting...
            </div>
          ) : (
            "Submit Review"
          )}
        </button>
      </form>

      <div className="mt-4 text-sm text-gray-500">
        <p>* Required fields</p>
        <p>Your review will be published after moderation.</p>
      </div>
    </div>
  );
};

export default ReviewForm;
