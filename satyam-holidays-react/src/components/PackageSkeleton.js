import React from "react";

const PackageSkeleton = () => {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      aria-busy="true"
      aria-label="Loading packages"
    >
      {[...Array(6)].map((_, index) => (
        <div key={index} className="glass-card rounded-2xl overflow-hidden animate-pulse">
          <div className="h-48 bg-gray-200 dark:bg-navy-700" />
          <div className="p-6 space-y-4">
            <div className="h-6 w-3/4 bg-gray-200 dark:bg-navy-700 rounded" />
            <div className="h-4 w-full bg-gray-200 dark:bg-navy-700 rounded" />
            <div className="h-4 w-5/6 bg-gray-200 dark:bg-navy-700 rounded" />

            <div className="flex gap-2 mt-4">
              <div className="h-6 w-16 bg-gray-200 dark:bg-navy-700 rounded-full" />
              <div className="h-6 w-16 bg-gray-200 dark:bg-navy-700 rounded-full" />
            </div>

            <div className="h-10 w-full bg-gray-200 dark:bg-navy-700 rounded-lg mt-4" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default PackageSkeleton;
