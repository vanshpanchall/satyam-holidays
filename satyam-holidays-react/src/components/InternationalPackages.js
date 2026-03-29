import { useState, useEffect } from "react";
import { FaMapMarkerAlt, FaClock, FaStar, FaGlobe } from "react-icons/fa";
import PackageDetailModal from "./PackageDetailModal";
import { apiUrl } from "../config/siteConfig";
import PackageSkeleton from "./PackageSkeleton";

const InternationalPackages = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoading(true);
        const response = await fetch(apiUrl("/api/packages?category=international&limit=50"));
        if (!response.ok) throw new Error("Failed to load packages");
        const json = await response.json();
        if (json.success) {
          setPackages(json.data);
        } else {
          setError(json.message || "Failed to load packages");
        }
      } catch {
        setError("Failed to fetch packages");
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);

  const categories = [
    { id: "all", name: "All Destinations" },
    { id: "dubai", name: "Dubai" },
    { id: "singapore", name: "Singapore" },
    { id: "vietnam", name: "Vietnam" },
    { id: "thailand", name: "Thailand" },
    { id: "nepal", name: "Nepal" },
    { id: "andaman", name: "Andaman & Nicobar" },
  ];

  const filteredPackages =
    activeCategory === "all"
      ? packages
      : packages.filter(
          (pkg) => pkg.category === activeCategory || pkg.subcategory === activeCategory
        );

  const handlePackageClick = (pkg) => {
    setSelectedPackage(pkg);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPackage(null);
  };

  return (
    <section className="section-padding relative overflow-hidden scroll-mt-24 md:scroll-mt-28">
      <div className="absolute inset-0 bg-white/60 dark:bg-navy-900/80"></div>
      <div className="absolute inset-0 mesh-gradient"></div>
      <div className="container-custom relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-navy-900 dark:text-white mb-4">
            International <span className="gradient-text">Packages</span>
          </h2>
          <p className="text-xl text-navy-700 dark:text-navy-200 max-w-3xl mx-auto">
            Embark on international adventures with our carefully curated packages. From luxury
            destinations to adventure getaways, explore the world with us.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              aria-pressed={activeCategory === category.id}
              className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                activeCategory === category.id
                  ? "btn-primary text-white shadow-glow-primary"
                  : "glass-card text-navy-700 dark:text-navy-200 hover:bg-white/90 dark:hover:bg-navy-700/80"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Packages Grid */}
        {loading ? (
          <PackageSkeleton />
        ) : error ? (
          <div className="text-center py-20 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-900">
            <p className="text-red-600 dark:text-red-400 text-lg">{error}</p>
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="text-center py-20 bg-white/50 dark:bg-navy-800/50 rounded-2xl glass-card">
            <p className="text-navy-600 dark:text-navy-300 text-lg">
              No packages found for this category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="glass-card rounded-2xl group cursor-pointer"
                onClick={() => handlePackageClick(pkg)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handlePackageClick(pkg);
                  }
                }}
              >
                {/* Package Image */}
                <div className="relative h-48 overflow-hidden rounded-t-xl">
                  <img
                    src={pkg.image}
                    alt={pkg.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                    decoding="async"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute top-4 right-4 bg-primary-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                    {pkg.price}
                  </div>
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-white shadow-lg border border-white/20">
                    <FaGlobe className="inline mr-1 text-secondary-400" />
                    {pkg.visa}
                  </div>
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-white shadow-lg border border-white/20">
                    <FaMapMarkerAlt className="inline mr-1 text-primary-400" />
                    {pkg.location}
                  </div>
                </div>

                {/* Package Content */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-bold text-navy-900 dark:text-white group-hover:text-primary-500 transition-colors duration-300">
                      {pkg.name}
                    </h3>
                    <div className="flex items-center">
                      <FaStar className="text-yellow-400 mr-1" />
                      <span className="text-sm font-medium text-navy-700 dark:text-navy-200">
                        {pkg.rating}
                      </span>
                      <span className="text-xs text-navy-500 dark:text-navy-400 ml-1">
                        ({pkg.reviews})
                      </span>
                    </div>
                  </div>

                  <p className="text-navy-700 dark:text-navy-200 mb-4 leading-relaxed">
                    {pkg.description}
                  </p>

                  <div className="flex items-center text-sm text-navy-600 dark:text-navy-300 mb-4">
                    <FaClock className="mr-2" />
                    {pkg.duration}
                  </div>

                  {/* Highlights */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-navy-900 dark:text-white mb-2">
                      Highlights:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {pkg.highlights.map((highlight, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 glass-badge text-primary-700 dark:text-primary-300 text-xs rounded-full"
                        >
                          {highlight}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    className="w-full btn btn-primary min-h-[44px]"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click
                      handlePackageClick(pkg);
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Call to Action */}
        <div className="text-center mt-16">
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
