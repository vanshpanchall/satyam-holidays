import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { FaCheck, FaTimes, FaSkull, FaStar, FaFilter, FaRegStar, FaTrashAlt } from "react-icons/fa";
import { apiUrl, fetchWithAuth, safeJson, toastApiError } from "../../config/siteConfig";

const ReviewModeration = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState("pending");
  const [packagesMap, setPackagesMap] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchReviews();
    fetchPackages();
  }, [statusTab]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      // Fetch reviews with specific status (or all if not specified)
      const res = await fetchWithAuth(apiUrl(`/api/v1/reviews?status=${statusTab}&limit=50`));
      if (res.status === 401) {
        navigate("/admin/login", { replace: true });
        return;
      }
      const json = await safeJson(res);
      if (json.success) {
        setReviews(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch reviews", err);
      toastApiError(err, "Failed to load reviews list");
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const res = await fetch(apiUrl("/api/v1/packages?limit=100"));
      const json = await safeJson(res);
      if (json.success && Array.isArray(json.data)) {
        const pkgMap = {};
        json.data.forEach((pkg) => {
          pkgMap[pkg._id || pkg.id] = pkg.title;
        });
        setPackagesMap(pkgMap);
      }
    } catch (err) {
      console.error("Failed to load packages mapping", err);
    }
  };

  const handleUpdateStatus = async (reviewId, newStatus) => {
    try {
      const res = await fetchWithAuth(apiUrl(`/api/v1/reviews/${reviewId}/status`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await safeJson(res);
      if (json.success) {
        toast.success(`Review successfully marked as ${newStatus}`);
        setReviews((prev) => prev.filter((rev) => rev._id !== reviewId && rev.id !== reviewId));
      } else {
        toastApiError(json, "Failed to update review status");
      }
    } catch (err) {
      toastApiError(err, "Failed to update review status");
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Are you sure you want to permanently delete this review?")) return;
    try {
      const res = await fetchWithAuth(apiUrl(`/api/v1/reviews/${reviewId}`), {
        method: "DELETE",
      });
      const json = await safeJson(res);
      if (res.ok && json.success) {
        toast.success("Review deleted permanently");
        setReviews((prev) => prev.filter((rev) => rev._id !== reviewId && rev.id !== reviewId));
      } else {
        toastApiError(json, "Failed to delete review");
      }
    } catch (err) {
      toastApiError(err, "Error deleting review");
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<FaStar key={i} className="text-amber-400 text-sm" />);
      } else {
        stars.push(<FaRegStar key={i} className="text-slate-300 dark:text-slate-600 text-sm" />);
      }
    }
    return <div className="flex gap-0.5">{stars}</div>;
  };

  const tabs = [
    { id: "pending", label: "Pending Approval" },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
    { id: "spam", label: "Spam Flagged" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Review Moderation Queue
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Moderate client feedback, spam reviews, and rating submissions
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusTab === tab.id
                  ? "bg-amber-500 text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Queue list */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reviews.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence>
              {reviews.map((rev) => {
                const packageTitle = packagesMap[rev.packageId] || "Loading Package Title...";
                const isSpamAlert = rev.spamScore > 50;

                return (
                  <motion.div
                    key={rev._id || rev.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`bg-white dark:bg-slate-800 rounded-xl border p-5 transition-all shadow-sm ${
                      isSpamAlert && statusTab === "pending"
                        ? "border-rose-400/50 dark:border-rose-500/30 bg-rose-50/10 dark:bg-rose-950/5"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* Left: Review details */}
                      <div className="space-y-2 max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {packageTitle}
                          </span>
                          {renderStars(rev.rating)}
                          {rev.spamScore > 0 && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                rev.spamScore > 50
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                              }`}
                            >
                              Spam Score: {rev.spamScore}%
                            </span>
                          )}
                        </div>

                        {rev.title && (
                          <h4 className="font-bold text-slate-800 dark:text-white text-base">
                            "{rev.title}"
                          </h4>
                        )}

                        <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap">
                          {rev.comment}
                        </p>

                        <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>
                            By: <strong>{rev.name}</strong> ({rev.email})
                          </span>
                          <span>•</span>
                          <span>Submitted: {new Date(rev.createdAt).toLocaleString()}</span>
                          {rev.ipAddress && (
                            <>
                              <span>•</span>
                              <span>IP: {rev.ipAddress}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex md:flex-col lg:flex-row gap-2 shrink-0 md:self-stretch justify-end items-end md:items-center">
                        {statusTab !== "approved" && (
                          <button
                            onClick={() => handleUpdateStatus(rev._id || rev.id, "approved")}
                            className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5"
                            title="Approve Review"
                          >
                            <FaCheck /> Approve
                          </button>
                        )}
                        {statusTab !== "rejected" && (
                          <button
                            onClick={() => handleUpdateStatus(rev._id || rev.id, "rejected")}
                            className="p-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5"
                            title="Reject Review"
                          >
                            <FaTimes /> Reject
                          </button>
                        )}
                        {statusTab !== "spam" && (
                          <button
                            onClick={() => handleUpdateStatus(rev._id || rev.id, "spam")}
                            className="p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5"
                            title="Flag as Spam"
                          >
                            <FaSkull /> Spam
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteReview(rev._id || rev.id)}
                          className="p-2.5 bg-slate-200 hover:bg-red-600 hover:text-white dark:bg-slate-700 dark:hover:bg-red-700 text-slate-700 dark:text-slate-350 rounded-lg transition-colors cursor-pointer text-xs font-semibold"
                          title="Delete Permanently"
                        >
                          <FaTrashAlt />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400">
            No reviews in the "{tabs.find((t) => t.id === statusTab)?.label}" queue.
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewModeration;
