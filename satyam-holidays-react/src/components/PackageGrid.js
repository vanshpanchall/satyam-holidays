import React from "react";
import PropTypes from "prop-types";
import PackageCard from "./PackageCard";
import PackageSkeleton from "./PackageSkeleton";

/**
 * Shared Package Grid component for displaying packages with pagination
 */
const PackageGrid = ({
  packages,
  loading,
  loadingMore = false,
  error,
  onPackageClick,
  showVisa = false,
  emptyMessage = "No packages found for this category.",
  hasMore = false,
  onLoadMore,
}) => {
  if (loading) {
    return <PackageSkeleton />;
  }

  if (error) {
    return (
      <div
        className="text-center py-16 px-6 bg-red-50/50 dark:bg-red-950/10 rounded-2xl border border-red-200/50 dark:border-red-900/50 max-w-lg mx-auto shadow-lg"
        role="alert"
      >
        <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-red-500/10 dark:bg-red-500/20 rounded-full animate-ping"
            style={{ animationDuration: "3s" }}
          />
          <div className="absolute inset-2 bg-red-500/20 dark:bg-red-500/30 rounded-full animate-pulse" />
          <svg
            className="w-10 h-10 text-red-600 dark:text-red-400 relative z-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
          Failed to load packages
        </h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 max-w-sm mx-auto">
          We encountered an error loading the tours:{" "}
          <span className="font-semibold text-red-600 dark:text-red-400">{error}</span>. Please
          verify your connection.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="text-center py-16 px-6 bg-white/40 dark:bg-navy-800/40 rounded-2xl border border-slate-200/30 dark:border-slate-700/30 max-w-lg mx-auto shadow-md backdrop-blur-md">
        <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-amber-500/10 dark:bg-amber-500/20 rounded-full animate-pulse"
            style={{ animationDuration: "4s" }}
          />
          <svg
            className="w-10 h-10 text-amber-500 dark:text-amber-400 relative z-10 animate-bounce"
            style={{ animationDuration: "2.5s" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">No Packages Found</h3>
        <p className="text-slate-500 dark:text-navy-200 text-sm max-w-sm mx-auto">
          {emptyMessage} Try adjusting your search query, clearing filter presets, or check back
          later!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {packages.map((pkg) => (
          <PackageCard
            key={pkg.id?.toString() || pkg._id?.toString()}
            pkg={pkg}
            onClick={onPackageClick}
            showVisa={showVisa}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-12">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="group relative px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 dark:focus:ring-offset-navy-900"
          >
            {loadingMore ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Loading...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Load More Packages
                <svg
                  className="w-4 h-4 group-hover:translate-y-0.5 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            )}
          </button>
        </div>
      )}
    </>
  );
};

PackageGrid.propTypes = {
  packages: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  loadingMore: PropTypes.bool,
  error: PropTypes.string,
  onPackageClick: PropTypes.func.isRequired,
  showVisa: PropTypes.bool,
  emptyMessage: PropTypes.string,
  hasMore: PropTypes.bool,
  onLoadMore: PropTypes.func,
};

export default PackageGrid;
