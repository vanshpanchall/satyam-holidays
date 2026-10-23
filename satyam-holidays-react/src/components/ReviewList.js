import React, { useEffect, useState } from "react";
import { PiSealCheck, PiStarFill, PiThumbsUp } from "react-icons/pi";
import { toast } from "react-toastify";
import { apiUrl, fetchWithAuth } from "../config/siteConfig";
import { useSiteConfig } from "../contexts/SettingsContext";

const DEFAULT_PAGINATION = { currentPage: 1, totalPages: 1, hasNext: false, hasPrev: false };

// The API has shipped two pagination shapes ({page, hasNextPage} and {currentPage, hasNext})
const normalizePagination = (p) => {
  if (!p) return DEFAULT_PAGINATION;
  const currentPage = Number(p.currentPage ?? p.page) || 1;
  const totalPages = Number(p.totalPages) || 1;
  return {
    currentPage,
    totalPages,
    hasNext: Boolean(p.hasNext ?? p.hasNextPage ?? currentPage < totalPages),
    hasPrev: Boolean(p.hasPrev ?? p.hasPrevPage ?? currentPage > 1),
  };
};

// Supports { data: [...], pagination } and { data: { reviews, pagination } }
const parseReviewsPayload = (apiResponse) => {
  const payload = apiResponse?.data;
  if (Array.isArray(payload)) {
    return { reviews: payload, pagination: normalizePagination(apiResponse?.pagination) };
  }
  if (payload && Array.isArray(payload.reviews)) {
    return {
      reviews: payload.reviews,
      pagination: normalizePagination(payload.pagination || apiResponse?.pagination),
    };
  }
  return { reviews: [], pagination: normalizePagination(apiResponse?.pagination) };
};

const parseSummaryPayload = (apiResponse) => {
  const raw = apiResponse?.data || {};
  const average = Number(raw.averageRating);
  const dist = raw.ratingDistribution || {};
  return {
    totalReviews: Number(raw.totalReviews) || 0,
    averageRating: Number.isFinite(average) ? average : 0,
    ratingDistribution: [1, 2, 3, 4, 5].reduce(
      (acc, n) => ({ ...acc, [n]: Number(dist[n]) || 0 }),
      {}
    ),
    verifiedReviews: Number(raw.verifiedReviews) || 0,
  };
};

const Stars = ({ rating, size = "h-4 w-4" }) => (
  <span className="flex gap-0.5" aria-label={`${rating} out of 5`}>
    {Array.from({ length: 5 }, (_, i) => (
      <PiStarFill
        key={i}
        aria-hidden="true"
        className={`${size} ${i < rating ? "text-saffron-500" : "text-line"}`}
      />
    ))}
  </span>
);

const ReviewCard = ({ review, onHelpfulClick }) => {
  const { company } = useSiteConfig();
  const [busy, setBusy] = useState(false);
  const date = review.formattedDate || review.createdAt;

  return (
    <article className="border-t border-line py-6 first:border-t-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-raised font-display text-lg text-fg">
            {String(review.name || "?")
              .charAt(0)
              .toUpperCase()}
          </span>
          <div>
            <p className="flex items-center gap-1.5 font-medium text-fg">
              {review.name}
              {review.verified && (
                <span className="flex items-center gap-1 text-xs font-normal text-emerald-700 dark:text-emerald-400">
                  <PiSealCheck className="h-4 w-4" /> Verified
                </span>
              )}
            </p>
            {date && <p className="text-xs text-muted">{date}</p>}
          </div>
        </div>
        <Stars rating={review.rating} />
      </div>
      {review.title && <p className="mt-4 font-medium text-fg">{review.title}</p>}
      <p className="mt-2 leading-relaxed text-muted">{review.comment}</p>
      {review.adminReply?.text && (
        <div className="mt-4 rounded-2xl bg-raised p-4 text-sm">
          <p className="text-xs font-medium text-fg">Response from {company.name}</p>
          <p className="mt-1 leading-relaxed text-muted">{review.adminReply.text}</p>
        </div>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onHelpfulClick(review.id);
          } finally {
            setBusy(false);
          }
        }}
        className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg disabled:opacity-50"
        aria-label={`Mark review by ${review.name} as helpful`}
      >
        <PiThumbsUp className="h-4 w-4" /> Helpful ({review.helpful || 0})
      </button>
    </article>
  );
};

const SORT_OPTIONS = [
  { id: "createdAt", label: "Newest" },
  { id: "rating", label: "Rating" },
  { id: "helpful", label: "Most helpful" },
];

const ReviewList = ({ packageId }) => {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);

  const handleHelpfulClick = async (reviewId) => {
    try {
      const response = await fetchWithAuth(apiUrl(`/api/reviews/${reviewId}/helpful`), {
        method: "PATCH",
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, helpful: data.data.helpful } : r))
      );
      toast.success("Thanks for the feedback!");
    } catch {
      toast.error("Couldn't record that — please try again.");
    }
  };

  const handleSortChange = (next) => {
    setSortOrder(sortBy === next && sortOrder === "desc" ? "asc" : "desc");
    setSortBy(next);
    setPage(1);
  };

  useEffect(() => {
    if (!packageId) return undefined;
    const controller = new AbortController();
    const { signal } = controller;

    setLoading(true);
    fetch(
      apiUrl(
        `/api/reviews/package/${packageId}?page=${page}&limit=5&sortBy=${sortBy}&sortOrder=${sortOrder}`
      ),
      { signal }
    )
      .then((res) => {
        if (!res.ok) throw new Error("Couldn't load reviews");
        return res.json();
      })
      .then((data) => {
        if (!data.success) throw new Error(data.message || "Couldn't load reviews");
        const parsed = parseReviewsPayload(data);
        setReviews(parsed.reviews);
        setPagination(parsed.pagination);
        setError(null);
      })
      .catch((err) => err.name !== "AbortError" && setError(err.message))
      .finally(() => !signal.aborted && setLoading(false));

    fetch(apiUrl(`/api/reviews/package/${packageId}/summary`), { signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.success && setSummary(parseSummaryPayload(data)))
      .catch(() => {});

    return () => controller.abort();
  }, [packageId, sortBy, sortOrder, page]);

  if (loading && !summary && reviews.length === 0) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="skeleton h-24 rounded-3xl" />
        <div className="skeleton h-20 rounded-3xl" />
      </div>
    );
  }

  if (error) return <p className="text-muted">{error}</p>;

  const total = summary?.totalReviews || 0;

  return (
    <div>
      {summary && total > 0 && (
        <div className="mb-8 grid gap-8 rounded-3xl bg-raised p-6 sm:grid-cols-[auto_1fr] sm:items-center md:p-8">
          <div>
            <p className="font-display text-6xl font-light text-fg">
              {summary.averageRating.toFixed(1)}
            </p>
            <Stars rating={Math.round(summary.averageRating)} />
            <p className="mt-2 text-sm text-muted">
              Based on {total} review{total !== 1 ? "s" : ""}
              {summary.verifiedReviews > 0 && ` · ${summary.verifiedReviews} verified`}
            </p>
          </div>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((n) => {
              const count = summary.ratingDistribution[n] || 0;
              return (
                <div key={n} className="flex items-center gap-3 text-sm">
                  <span className="w-3 text-muted">{n}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-saffron-500"
                      style={{ width: `${total ? (count / total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-muted">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {reviews.length > 0 ? (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm text-muted">Sort by:</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSortChange(opt.id)}
                aria-pressed={sortBy === opt.id}
                className={`chip h-8 px-3 text-[13px] ${sortBy === opt.id ? "chip-active" : ""}`}
              >
                {opt.label}
                {sortBy === opt.id && (
                  <span aria-hidden="true">{sortOrder === "desc" ? "↓" : "↑"}</span>
                )}
              </button>
            ))}
          </div>
          <div className={loading ? "opacity-60" : ""}>
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} onHelpfulClick={handleHelpfulClick} />
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-dashed border-line p-10 text-center">
          <p className="font-display text-2xl text-fg">No reviews yet</p>
          <p className="mt-2 text-muted">
            Travelled on this trip? Be the first to share how it went.
          </p>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <nav aria-label="Review pages" className="mt-8 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage(pagination.currentPage - 1)}
            disabled={!pagination.hasPrev}
            className="btn btn-ghost h-9 px-4"
          >
            Previous
          </button>
          <span className="px-3 text-sm text-muted">
            {pagination.currentPage} / {pagination.totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(pagination.currentPage + 1)}
            disabled={!pagination.hasNext}
            className="btn btn-ghost h-9 px-4"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
};

export default ReviewList;
