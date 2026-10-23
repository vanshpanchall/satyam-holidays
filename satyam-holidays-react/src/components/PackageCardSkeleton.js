import React from "react";

const PackageCardSkeleton = () => (
  <div aria-hidden="true">
    <div className="skeleton aspect-[4/5] rounded-3xl" />
    <div className="skeleton mt-4 h-5 w-3/4 rounded-full" />
    <div className="skeleton mt-3 h-4 w-1/2 rounded-full" />
  </div>
);

export const PackageGridSkeleton = ({ count = 6 }) => (
  <div
    className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
    role="status"
    aria-label="Loading packages"
  >
    {Array.from({ length: count }, (_, i) => (
      <PackageCardSkeleton key={i} />
    ))}
  </div>
);

export default PackageCardSkeleton;
