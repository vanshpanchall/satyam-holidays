import React, { useState } from "react";
import ReviewForm from "./ReviewForm";
import ReviewList from "./ReviewList";

const ReviewsSection = ({ packageId, packageTitle }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleReviewSubmitted = () => {
    // Trigger a refresh of the review list
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Customer Reviews</h2>
        <p className="text-gray-600 dark:text-navy-300">
          Read what our customers say about their experiences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Review Form - Takes up 1 column on large screens */}
        <div className="lg:col-span-1">
          <ReviewForm
            packageId={packageId}
            packageTitle={packageTitle}
            onReviewSubmitted={handleReviewSubmitted}
          />
        </div>

        {/* Review List - Takes up 2 columns on large screens */}
        <div className="lg:col-span-2">
          <ReviewList
            packageId={packageId}
            key={refreshTrigger} // Force re-render when new review is submitted
          />
        </div>
      </div>
    </div>
  );
};

export default ReviewsSection;
