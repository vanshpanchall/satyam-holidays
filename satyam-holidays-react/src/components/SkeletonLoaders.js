import React from "react";

/* ─── Shimmer base ─── */
const Shimmer = ({ className = "" }) => <div className={`skeleton-shimmer rounded ${className}`} />;

/* ─── Page-level skeleton (used by App.js Suspense) ─── */
export const PageSkeleton = () => (
  <div className="min-h-screen bg-white dark:bg-navy-900">
    {/* Navbar skeleton */}
    <div className="glass-navbar sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Shimmer className="w-10 h-10 rounded-full" />
        <Shimmer className="w-36 h-5" />
      </div>
      <div className="hidden md:flex items-center gap-6">
        <Shimmer className="w-16 h-4" />
        <Shimmer className="w-16 h-4" />
        <Shimmer className="w-16 h-4" />
        <Shimmer className="w-16 h-4" />
        <Shimmer className="w-28 h-10 rounded-xl" />
      </div>
    </div>

    {/* Hero skeleton */}
    <div className="relative h-[80vh] flex items-center justify-center">
      <Shimmer className="absolute inset-0 rounded-none" />
      <div className="relative z-10 text-center space-y-4 px-4">
        <Shimmer className="w-64 h-8 mx-auto" />
        <Shimmer className="w-96 h-12 mx-auto" />
        <Shimmer className="w-80 h-5 mx-auto" />
        <div className="flex gap-4 justify-center mt-6">
          <Shimmer className="w-40 h-12 rounded-xl" />
          <Shimmer className="w-40 h-12 rounded-xl" />
        </div>
      </div>
    </div>

    {/* Section skeletons */}
    <ServicesSkeleton />
    <PackagesSkeleton />
  </div>
);

/* ─── Services section skeleton ─── */
export const ServicesSkeleton = () => (
  <section className="section-padding">
    <div className="container-custom">
      <div className="text-center mb-12 space-y-3">
        <Shimmer className="w-32 h-4 mx-auto" />
        <Shimmer className="w-64 h-8 mx-auto" />
        <Shimmer className="w-96 h-4 mx-auto" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-6 space-y-4">
            <Shimmer className="w-14 h-14 rounded-xl" />
            <Shimmer className="w-40 h-5" />
            <div className="space-y-2">
              <Shimmer className="w-full h-3" />
              <Shimmer className="w-3/4 h-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ─── About section skeleton ─── */
export const AboutSkeleton = () => (
  <section className="section-padding">
    <div className="container-custom">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <Shimmer className="w-24 h-4" />
          <Shimmer className="w-72 h-8" />
          <div className="space-y-3">
            <Shimmer className="w-full h-4" />
            <Shimmer className="w-full h-4" />
            <Shimmer className="w-5/6 h-4" />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-4 space-y-2">
                <Shimmer className="w-16 h-8" />
                <Shimmer className="w-24 h-3" />
              </div>
            ))}
          </div>
        </div>
        <Shimmer className="w-full h-80 rounded-2xl" />
      </div>
    </div>
  </section>
);

/* ─── Packages section skeleton (domestic/international) ─── */
export const PackagesSkeleton = () => (
  <section className="section-padding">
    <div className="container-custom">
      <div className="text-center mb-12 space-y-3">
        <Shimmer className="w-40 h-4 mx-auto" />
        <Shimmer className="w-72 h-8 mx-auto" />
      </div>
      {/* Category tabs */}
      <div className="flex gap-3 justify-center mb-8 flex-wrap">
        {[...Array(5)].map((_, i) => (
          <Shimmer key={i} className="w-24 h-9 rounded-full" />
        ))}
      </div>
      {/* Package cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(6)].map((_, i) => (
          <PackageCardSkeleton key={i} />
        ))}
      </div>
    </div>
  </section>
);

/* ─── Single package card skeleton ─── */
export const PackageCardSkeleton = () => (
  <div className="glass-card rounded-2xl overflow-hidden">
    <Shimmer className="w-full h-48 rounded-none" />
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Shimmer className="w-40 h-5" />
        <Shimmer className="w-16 h-4" />
      </div>
      <Shimmer className="w-full h-3" />
      <Shimmer className="w-2/3 h-3" />
      <div className="flex items-center gap-2 pt-1">
        <Shimmer className="w-20 h-4" />
        <Shimmer className="w-24 h-4" />
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        {[...Array(3)].map((_, i) => (
          <Shimmer key={i} className="w-20 h-6 rounded-full" />
        ))}
      </div>
      <Shimmer className="w-full h-11 rounded-xl mt-2" />
    </div>
  </div>
);

/* ─── Enquiry form skeleton ─── */
export const EnquirySkeleton = () => (
  <section className="section-padding">
    <div className="container-custom max-w-3xl">
      <div className="text-center mb-10 space-y-3">
        <Shimmer className="w-32 h-4 mx-auto" />
        <Shimmer className="w-56 h-8 mx-auto" />
        <Shimmer className="w-80 h-4 mx-auto" />
      </div>
      <div className="glass-card rounded-2xl p-8 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Shimmer className="w-20 h-4" />
              <Shimmer className="w-full h-11 rounded-lg" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Shimmer className="w-20 h-4" />
          <Shimmer className="w-full h-24 rounded-lg" />
        </div>
        <Shimmer className="w-full h-12 rounded-xl" />
      </div>
    </div>
  </section>
);

/* ─── Contact section skeleton ─── */
export const ContactSkeleton = () => (
  <section className="section-padding">
    <div className="container-custom">
      <div className="text-center mb-10 space-y-3">
        <Shimmer className="w-32 h-4 mx-auto" />
        <Shimmer className="w-48 h-8 mx-auto" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-6 text-center space-y-3">
            <Shimmer className="w-12 h-12 mx-auto rounded-full" />
            <Shimmer className="w-28 h-5 mx-auto" />
            <Shimmer className="w-40 h-3 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ─── Footer skeleton ─── */
export const FooterSkeleton = () => (
  <footer className="bg-navy-900 py-12">
    <div className="container-custom">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Shimmer className="w-32 h-5" />
            <Shimmer className="w-full h-3" />
            <Shimmer className="w-5/6 h-3" />
            <Shimmer className="w-3/4 h-3" />
          </div>
        ))}
      </div>
    </div>
  </footer>
);
