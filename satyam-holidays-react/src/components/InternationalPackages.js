import { useState, useCallback } from "react";
import PackageDetailModal from "./PackageDetailModal";
import PackageGrid from "./PackageGrid";
import CategoryFilter from "./CategoryFilter";
import usePackages from "../utils/usePackages";
import useReveal from "../utils/useReveal";

const INTERNATIONAL_CATEGORIES = [
  { id: "all", name: "All Destinations" },
  { id: "dubai", name: "Dubai" },
  { id: "singapore", name: "Singapore" },
  { id: "vietnam", name: "Vietnam" },
  { id: "thailand", name: "Thailand" },
  { id: "nepal", name: "Nepal" },
  { id: "andaman", name: "Andaman & Nicobar" },
];

const InternationalPackages = () => {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { packages, loading, error, activeFilter, setFilter } = usePackages("international");

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
    <section className="section-padding relative overflow-hidden scroll-mt-24 md:scroll-mt-28">
      <div className="absolute inset-0 bg-white/60 dark:bg-navy-900/80"></div>
      <div className="absolute inset-0 mesh-gradient"></div>
      <div className="container-custom relative z-10">
        {/* Section Header */}
        <div
          ref={headerReveal.ref}
          className={`text-center mb-16 reveal ${headerReveal.isVisible ? "reveal--visible" : ""}`}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-navy-900 dark:text-white mb-4">
            International <span className="gradient-text">Packages</span>
          </h2>
          <p className="text-xl text-navy-700 dark:text-navy-200 max-w-3xl mx-auto">
            Embark on international adventures with our carefully curated packages. From luxury
            destinations to adventure getaways, explore the world with us.
          </p>
        </div>

        {/* Category Filter */}
        <CategoryFilter
          categories={INTERNATIONAL_CATEGORIES}
          activeCategory={activeFilter}
          onCategoryChange={setFilter}
        />

        {/* Packages Grid */}
        <PackageGrid
          packages={packages}
          loading={loading}
          error={error}
          onPackageClick={handlePackageClick}
          showVisa={true}
        />

        {/* Call to Action */}
        <div
          ref={ctaReveal.ref}
          className={`text-center mt-16 reveal-scale ${ctaReveal.isVisible ? "reveal-scale--visible" : ""}`}
        >
          <div className="glass-card rounded-2xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-navy-900 dark:text-white mb-4">
              Ready for Your International Adventure?
            </h3>
            <p className="text-navy-700 dark:text-navy-200 mb-6">
              Our travel experts can help you plan the perfect international trip with visa
              assistance and travel insurance.
            </p>
            <button
              onClick={() => {
                const el = document.getElementById("enquiry");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="btn btn-primary shadow-glow-primary"
            >
              Plan Your International Trip
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

export default InternationalPackages;
