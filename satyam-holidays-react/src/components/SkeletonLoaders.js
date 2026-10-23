import React from "react";

const Bone = ({ className = "" }) => <div className={`skeleton rounded-full ${className}`} />;

const BarSkeleton = () => (
  <div className="border-b border-line">
    <div className="container-site flex h-[4.5rem] items-center justify-between">
      <div className="flex items-center gap-3">
        <Bone className="h-10 w-10" />
        <Bone className="h-5 w-36" />
      </div>
      <div className="hidden gap-6 lg:flex">
        {Array.from({ length: 5 }, (_, i) => (
          <Bone key={i} className="h-3 w-16" />
        ))}
      </div>
      <Bone className="h-10 w-28" />
    </div>
  </div>
);

/** Route-level fallback (App.js Suspense) */
export const PageSkeleton = () => (
  <div className="min-h-screen bg-page" role="status" aria-label="Loading">
    <BarSkeleton />
    <div className="container-site py-16">
      <Bone className="h-3 w-24" />
      <Bone className="mt-6 h-12 w-2/3 max-w-2xl" />
      <Bone className="mt-4 h-12 w-1/2 max-w-xl" />
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="skeleton aspect-[4/5] rounded-3xl" />
        ))}
      </div>
    </div>
  </div>
);

/** Mirrors the package detail layout so the page doesn't jump when data arrives */
export const PackageDetailSkeleton = () => (
  <div className="min-h-screen bg-page" role="status" aria-label="Loading trip">
    <BarSkeleton />
    <div className="container-site pt-10">
      <Bone className="h-3 w-48" />
      <Bone className="mt-8 h-4 w-32" />
      <Bone className="mt-4 h-12 w-3/4 max-w-3xl" />
      <Bone className="mt-4 h-4 w-72" />
      <div className="skeleton mt-8 h-[52vh] min-h-[320px] rounded-4xl md:h-[64vh]" />
      <div className="mt-12 grid gap-12 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <Bone className="h-8 w-40" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-4/5" />
        </div>
        <div className="skeleton h-96 rounded-3xl lg:col-span-4" />
      </div>
    </div>
  </div>
);
