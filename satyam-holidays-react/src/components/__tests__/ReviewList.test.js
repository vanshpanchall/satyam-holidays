import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import ReviewList from "../ReviewList";

const packageId = "507f1f77bcf86cd799439011";

const summaryPayload = {
  success: true,
  data: {
    totalReviews: 1,
    averageRating: 5,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
    verifiedReviews: 1,
  },
};

const reviewItem = {
  id: "r1",
  name: "Asha Patel",
  rating: 5,
  comment: "Amazing experience and excellent support throughout the trip.",
  verified: true,
  helpful: 2,
  createdAt: "1 Apr 2026",
};

const createJsonResponse = (payload, ok = true) => ({
  ok,
  json: async () => payload,
});

describe("ReviewList", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders reviews when API returns top-level array shape", async () => {
    jest.spyOn(global, "fetch").mockImplementation((url) => {
      const value = String(url);

      if (value.includes(`/api/v1/reviews/package/${packageId}/summary`)) {
        return Promise.resolve(createJsonResponse(summaryPayload));
      }

      if (value.includes(`/api/v1/reviews/package/${packageId}?`)) {
        return Promise.resolve(
          createJsonResponse({
            success: true,
            data: [reviewItem],
            pagination: { currentPage: 1, totalPages: 1, hasNext: false, hasPrev: false },
          })
        );
      }

      return Promise.reject(new Error(`Unexpected URL: ${value}`));
    });

    render(<ReviewList packageId={packageId} />);

    await waitFor(() => {
      expect(screen.getByText("Asha Patel")).toBeInTheDocument();
    });

    expect(screen.getByText("Sort by:")).toBeInTheDocument();
  });

  it("renders reviews when API returns nested reviews shape", async () => {
    jest.spyOn(global, "fetch").mockImplementation((url) => {
      const value = String(url);

      if (value.includes(`/api/v1/reviews/package/${packageId}/summary`)) {
        return Promise.resolve(createJsonResponse(summaryPayload));
      }

      if (value.includes(`/api/v1/reviews/package/${packageId}?`)) {
        return Promise.resolve(
          createJsonResponse({
            success: true,
            data: {
              reviews: [reviewItem],
              pagination: { currentPage: 1, totalPages: 1, hasNext: false, hasPrev: false },
            },
          })
        );
      }

      return Promise.reject(new Error(`Unexpected URL: ${value}`));
    });

    render(<ReviewList packageId={packageId} />);

    await waitFor(() => {
      expect(screen.getByText("Asha Patel")).toBeInTheDocument();
    });

    expect(screen.getByText(/Based on 1 review/i)).toBeInTheDocument();
  });
});
