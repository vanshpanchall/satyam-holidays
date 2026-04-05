import { useState, useCallback } from "react";
import PackageDetailModal from "./PackageDetailModal";
import PackageGrid from "./PackageGrid";
import CategoryFilter from "./CategoryFilter";
import usePackages from "../utils/usePackages";
import useReveal from "../utils/useReveal";

const DOMESTIC_CATEGORIES = [
  { id: "all", name: "All Packages" },
  { id: "chardham", name: "Chardham" },
  { id: "south", name: "South India" },
  { id: "north", name: "North India" },
  { id: "kashmir", name: "Jammu & Kashmir" },
  { id: "bengal", name: "West Bengal" },
];

const DomesticPackages = ({ sectionId = "packages" }) => {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { packages, loading, error, activeFilter, setFilter } = usePackages("domestic");

  const handlePackageClick = useCallback((pkg) => {
    setSelectedPackage(pkg);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedPackage(null);
  }, []);

  const headerReveal = useReveal(0.2);
  const ctaReveal = useReveal(0.15);

  return (
    <section
      id={sectionId || undefined}
      className="section-padding relative overflow-hidden scroll-mt-24 md:scroll-mt-28"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-navy-50/80 to-white/80 dark:from-navy-900 dark:to-navy-800"></div>
      <div className="absolute inset-0 mesh-gradient"></div>
      <div className="container-custom relative z-10">
        {/* Section Header */}
        <div
          ref={headerReveal.ref}
          className={`text-center mb-16 reveal ${headerReveal.isVisible ? "reveal--visible" : ""}`}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-navy-900 dark:text-white mb-4">
            Domestic <span className="gradient-text">Packages</span>
          </h2>
          <p className="text-xl text-navy-700 dark:text-navy-200 max-w-3xl mx-auto">
            Discover the diverse beauty of India with our carefully curated domestic travel
            packages. From spiritual journeys to adventure getaways, we have something for every
            traveler.
          </p>
        </div>

        {/* Category Filter */}
        <CategoryFilter
          categories={DOMESTIC_CATEGORIES}
          activeCategory={activeFilter}
          onCategoryChange={setFilter}
        />

        {/* Packages Grid */}
        <PackageGrid
          packages={packages}
          loading={loading}
          error={error}
          onPackageClick={handlePackageClick}
          showVisa={false}
        />

        {/* Call to Action */}
        <div
          ref={ctaReveal.ref}
          className={`text-center mt-16 reveal-scale ${ctaReveal.isVisible ? "reveal-scale--visible" : ""}`}
        >
          <div className="glass-card rounded-2xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-navy-900 dark:text-white mb-4">
              Can&apos;t Find What You&apos;re Looking For?
            </h3>
            <p className="text-navy-700 dark:text-navy-200 mb-6">
              We can customize any package according to your preferences and requirements.
            </p>
            <button
              onClick={() => {
                const el = document.getElementById("enquiry");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="btn btn-primary shadow-glow-primary"
            >
              Customize Your Package
            </button>
          </div>
        </div>
      </div>

      {/* Package Detail Modal */}
      <PackageDetailModal
        package={selectedPackage}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </section>
  );
};

export default DomesticPackages;
