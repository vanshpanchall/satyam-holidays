import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PackageDetailModal from "./PackageDetailModal";
import PackageGrid from "./PackageGrid";
import CategoryFilter from "./CategoryFilter";
import usePackages from "../utils/usePackages";
import useReveal from "../utils/useReveal";

const parseDurationNights = (durationStr) => {
  const match = String(durationStr).match(/(\d+)\s*Nights?/i);
  if (match) return parseInt(match[1]);
  const dayMatch = String(durationStr).match(/(\d+)\s*Days?/i);
  if (dayMatch) return Math.max(1, parseInt(dayMatch[1]) - 1);
  return 0;
};

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
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recommended");
  const [budgetFilter, setBudgetFilter] = useState("all");
  const [durationFilter, setDurationFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");

  const { packages, loading, loadingMore, error, activeFilter, setFilter, loadMore, hasMore } =
    usePackages("domestic");

  const processedPackages = useMemo(() => {
    let result = [...packages];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (pkg) =>
          pkg.name?.toLowerCase().includes(q) ||
          pkg.location?.toLowerCase().includes(q) ||
          pkg.description?.toLowerCase().includes(q) ||
          pkg.subcategory?.toLowerCase().includes(q)
      );
    }

    // Budget filter
    if (budgetFilter !== "all") {
      result = result.filter((pkg) => {
        const price = pkg.numericPrice || 0;
        if (budgetFilter === "under-20k") return price < 20000;
        if (budgetFilter === "20k-50k") return price >= 20000 && price <= 50000;
        if (budgetFilter === "50k-1l") return price >= 50000 && price <= 100000;
        if (budgetFilter === "above-1l") return price > 100000;
        return true;
      });
    }

    // Duration filter
    if (durationFilter !== "all") {
      result = result.filter((pkg) => {
        const nights = parseDurationNights(pkg.duration);
        if (durationFilter === "short") return nights <= 3;
        if (durationFilter === "medium") return nights > 3 && nights <= 7;
        if (durationFilter === "long") return nights > 7;
        return true;
      });
    }

    // Rating filter
    if (ratingFilter !== "all") {
      const minRating = parseFloat(ratingFilter);
      result = result.filter((pkg) => (pkg.rating || 0) >= minRating);
    }

    // Sorting
    if (sortBy === "priceAsc") {
      result.sort((a, b) => (a.numericPrice || 0) - (b.numericPrice || 0));
    } else if (sortBy === "priceDesc") {
      result.sort((a, b) => (b.numericPrice || 0) - (a.numericPrice || 0));
    } else if (sortBy === "ratingDesc") {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === "durationAsc") {
      result.sort((a, b) => parseDurationNights(a.duration) - parseDurationNights(b.duration));
    } else if (sortBy === "durationDesc") {
      result.sort((a, b) => parseDurationNights(b.duration) - parseDurationNights(a.duration));
    }

    return result;
  }, [packages, searchQuery, sortBy, budgetFilter, durationFilter, ratingFilter]);

  const handlePackageClick = useCallback(
    (pkg) => {
      navigate(`/packages/${pkg.slug || pkg.id || pkg._id}`);
    },
    [navigate]
  );

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

        {/* Search, Sort and Filters Bar */}
        <div className="glass-card rounded-2xl p-6 mb-8 border border-navy-200/50 dark:border-navy-700/50">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Search Input */}
            <div className="md:col-span-2 lg:col-span-2 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search packages by name, location..."
                className="w-full px-4 py-2.5 pl-10 border border-gray-300 dark:border-navy-600 rounded-lg bg-white/80 dark:bg-navy-800/60 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-gray-800 dark:text-white"
              />
              <span className="absolute left-3 top-3.5 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
            </div>

            {/* Sort Select */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-navy-600 rounded-lg bg-white/80 dark:bg-navy-800/60 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-gray-800 dark:text-white"
              >
                <option value="recommended">Sort By: Recommended</option>
                <option value="priceAsc">Price: Low to High</option>
                <option value="priceDesc">Price: High to Low</option>
                <option value="ratingDesc">Rating: High to Low</option>
                <option value="durationAsc">Duration: Short to Long</option>
                <option value="durationDesc">Duration: Long to Short</option>
              </select>
            </div>

            {/* Budget Select */}
            <div>
              <select
                value={budgetFilter}
                onChange={(e) => setBudgetFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-navy-600 rounded-lg bg-white/80 dark:bg-navy-800/60 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-gray-800 dark:text-white"
              >
                <option value="all">Budget: All</option>
                <option value="under-20k">Under ₹20,000</option>
                <option value="20k-50k">₹20,000 - ₹50,000</option>
                <option value="50k-1l">₹50,000 - ₹1,00,000</option>
                <option value="above-1l">Above ₹1,00,000</option>
              </select>
            </div>

            {/* Duration Select */}
            <div>
              <select
                value={durationFilter}
                onChange={(e) => setDurationFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-navy-600 rounded-lg bg-white/80 dark:bg-navy-800/60 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-gray-800 dark:text-white"
              >
                <option value="all">Duration: All</option>
                <option value="short">Short (1-3 Nights)</option>
                <option value="medium">Medium (4-7 Nights)</option>
                <option value="long">Long (8+ Nights)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200/50 dark:border-navy-600/50">
            <span className="text-xs text-navy-500 dark:text-navy-400 font-medium">
              Found {processedPackages.length} package{processedPackages.length !== 1 ? "s" : ""}
            </span>
            {(searchQuery ||
              sortBy !== "recommended" ||
              budgetFilter !== "all" ||
              durationFilter !== "all" ||
              ratingFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSortBy("recommended");
                  setBudgetFilter("all");
                  setDurationFilter("all");
                  setRatingFilter("all");
                }}
                className="text-xs text-primary-500 hover:text-primary-600 font-semibold"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Packages Grid */}
        <PackageGrid
          packages={processedPackages}
          loading={loading}
          loadingMore={loadingMore}
          error={error}
          onPackageClick={handlePackageClick}
          showVisa={false}
          hasMore={hasMore}
          onLoadMore={loadMore}
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
