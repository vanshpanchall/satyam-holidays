import React from "react";
import PropTypes from "prop-types";
import PackageCard from "./PackageCard";
import PackageSkeleton from "./PackageSkeleton";

/**
 * Shared Package Grid component for displaying packages
 */
const PackageGrid = ({
  packages,
  loading,
  error,
  onPackageClick,
  showVisa = false,
  emptyMessage = "No packages found for this category.",
}) => {
  if (loading) {
    return <PackageSkeleton />;
  }

  if (error) {
    return (
      <div
        className="text-center py-20 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-900"
        role="alert"
      >
        <p className="text-red-600 dark:text-red-400 text-lg">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 btn btn-secondary">
          Try Again
        </button>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="text-center py-20 bg-white/50 dark:bg-navy-800/50 rounded-2xl glass-card">
        <p className="text-navy-600 dark:text-navy-300 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
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
  );
};

PackageGrid.propTypes = {
  packages: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
  onPackageClick: PropTypes.func.isRequired,
  showVisa: PropTypes.bool,
  emptyMessage: PropTypes.string,
};

export default PackageGrid;
