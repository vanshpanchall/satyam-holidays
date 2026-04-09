import React, { useState, useEffect, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { FaTimes, FaMapMarkerAlt, FaClock, FaStar, FaRupeeSign, FaCheck } from "react-icons/fa";
import ReviewsSection from "./ReviewsSection";
import Meta from "./Meta";
import { motion, AnimatePresence } from "framer-motion";
import { resolveImageUrl } from "../config/siteConfig";

const scrollToEnquiry = () => {
  const el = document.getElementById("enquiry");
  if (el) el.scrollIntoView({ behavior: "smooth" });
};

const PackageDetailModal = ({ package: pkg, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);
  const closeButtonRef = useRef(null);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") onClose();

      // Trap focus within modal
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      // Save the previously focused element
      previousActiveElement.current = document.activeElement;

      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";

      // Focus the close button when modal opens
      requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";

        // Restore focus to the previously focused element
        if (
          previousActiveElement.current &&
          typeof previousActiveElement.current.focus === "function"
        ) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !pkg) return null;

  const packageId = String(pkg.id ?? pkg._id ?? "package");
  const packageName = typeof pkg.name === "string" ? pkg.name : "Travel Package";
  const packageLocation = typeof pkg.location === "string" ? pkg.location : "";
  const packagePrice = pkg.price == null ? "" : String(pkg.price);
  const packageHighlights = Array.isArray(pkg.highlights) ? pkg.highlights : [];
  const modalTitleId = `modal-title-${packageId}`;

  const tabs = [
    { id: "overview", name: "Overview" },
    { id: "itinerary", name: "Itinerary" },
    { id: "reviews", name: "Reviews" },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Dynamic Meta for package detail */}
      <Meta
        title={`${packageName} — ${packageLocation} | Satyam Holidays`}
        description={pkg.description}
        image={resolveImageUrl(pkg.image)}
        url={typeof window !== "undefined" ? window.location.href : undefined}
      />
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Modal */}
            <div className="flex min-h-screen items-center justify-center p-4">
              <motion.div
                ref={modalRef}
                className="relative w-full max-w-6xl rounded-2xl max-h-[90vh] overflow-hidden shadow-glass-lg"
                style={{
                  background: "rgba(255,255,255,0.85)",
                  backdropFilter: "blur(24px) saturate(200%)",
                  WebkitBackdropFilter: "blur(24px) saturate(200%)",
                  border: "1px solid rgba(255,255,255,0.25)",
                }}
                role="dialog"
                aria-modal="true"
                aria-labelledby={modalTitleId}
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.98 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {/* Header Image */}
                <div className="relative h-64 md:h-80 overflow-hidden rounded-t-2xl">
                  <img
                    src={resolveImageUrl(pkg.image)}
                    alt={packageName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <button
                    ref={closeButtonRef}
                    onClick={onClose}
                    className="absolute top-4 right-4 glass-badge p-2 rounded-full text-gray-700 dark:text-navy-200 hover:text-gray-900 dark:hover:text-white transition-colors"
                    aria-label="Close package details"
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-4 left-4 bg-primary-500 text-white px-4 py-2 rounded-full font-medium">
                    <FaRupeeSign className="inline mr-1" />
                    {packagePrice.replace("₹", "")}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 max-h-[calc(90vh-320px)] overflow-y-auto">
                  {/* Package Header */}
                  <div className="mb-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h1
                          id={modalTitleId}
                          className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-2"
                        >
                          {packageName}
                        </h1>
                        <div className="flex items-center space-x-4 text-gray-600 dark:text-navy-300">
                          <div className="flex items-center">
                            <FaMapMarkerAlt className="mr-1" />
                            <span>{packageLocation}</span>
                          </div>
                          <div className="flex items-center">
                            <FaClock className="mr-1" />
                            <span>{pkg.duration}</span>
                          </div>
                          <div className="flex items-center">
                            <FaStar className="text-yellow-400 mr-1" />
                            <span className="font-medium">{pkg.rating}</span>
                            <span className="text-sm ml-1">({pkg.reviews} reviews)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-navy-200 text-lg leading-relaxed">
                      {pkg.description}
                    </p>
                  </div>

                  {/* Tabs */}
                  <div className="border-b border-gray-200 dark:border-navy-600 mb-6">
                    <nav className="flex space-x-8">
                      {tabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === tab.id
                              ? "border-primary-500 text-primary-600 dark:text-primary-400"
                              : "border-transparent text-gray-500 dark:text-navy-400 hover:text-gray-700 dark:hover:text-navy-200 hover:border-gray-300 dark:hover:border-navy-500"
                          }`}
                        >
                          {tab.name}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Tab Content */}
                  <div className="min-h-[400px]">
                    {activeTab === "overview" && (
                      <div className="space-y-6">
                        {/* Highlights */}
                        <div>
                          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                            Package Highlights
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {packageHighlights.map((highlight, index) => (
                              <div key={index} className="flex items-center space-x-3">
                                <FaCheck className="text-green-500 flex-shrink-0" />
                                <span className="text-gray-700 dark:text-navy-200">
                                  {highlight}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* What's Included */}
                        <div>
                          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                            What&apos;s Included
                          </h3>
                          <div className="glass-card rounded-lg p-4 dark:bg-navy-700/60">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <h4 className="font-medium text-gray-800 dark:text-white mb-2">
                                  Accommodation
                                </h4>
                                <ul className="space-y-1 text-gray-600 dark:text-navy-300">
                                  <li>• 3-5 Star Hotels</li>
                                  <li>• Breakfast Included</li>
                                  <li>• Comfortable Rooms</li>
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-800 dark:text-white mb-2">
                                  Transportation
                                </h4>
                                <ul className="space-y-1 text-gray-600 dark:text-navy-300">
                                  <li>• AC Vehicle</li>
                                  <li>• Fuel & Driver Charges</li>
                                  <li>• Local Transfers</li>
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-800 dark:text-white mb-2">
                                  Meals
                                </h4>
                                <ul className="space-y-1 text-gray-600 dark:text-navy-300">
                                  <li>• Daily Breakfast</li>
                                  <li>• Some Lunches/Dinners</li>
                                  <li>• Local Cuisine</li>
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-800 dark:text-white mb-2">
                                  Services
                                </h4>
                                <ul className="space-y-1 text-gray-600 dark:text-navy-300">
                                  <li>• Tour Guide</li>
                                  <li>• Entry Tickets</li>
                                  <li>• 24/7 Support</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "itinerary" && (
                      <div className="space-y-4">
                        <div className="text-center py-12">
                          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                            Detailed Itinerary
                          </h3>
                          <p className="text-gray-600 dark:text-navy-300 mb-6">
                            A comprehensive day-by-day breakdown of your journey will be provided
                            upon booking.
                          </p>
                          <button
                            onClick={() => {
                              onClose();
                              setTimeout(scrollToEnquiry, 300);
                            }}
                            className="btn btn-primary"
                          >
                            Get Detailed Itinerary
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === "reviews" && (
                      <ReviewsSection packageId={packageId} packageTitle={packageName} />
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div
                  className="border-t border-gray-200/50 dark:border-navy-600 p-6 rounded-b-2xl"
                  style={{ background: "rgba(248,250,252,0.6)", backdropFilter: "blur(8px)" }}
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                    <div className="text-center sm:text-left">
                      <div className="text-2xl font-bold text-gray-800 dark:text-white">
                        {packagePrice}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-navy-300">per person</div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          onClose();
                          setTimeout(scrollToEnquiry, 300);
                        }}
                        className="btn btn-secondary"
                      >
                        Customize Package
                      </button>
                      <button
                        onClick={() => {
                          onClose();
                          setTimeout(scrollToEnquiry, 300);
                        }}
                        className="btn btn-primary"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

PackageDetailModal.propTypes = {
  package: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    location: PropTypes.string.isRequired,
    duration: PropTypes.string.isRequired,
    price: PropTypes.string.isRequired,
    rating: PropTypes.number,
    reviews: PropTypes.number,
    image: PropTypes.string,
    description: PropTypes.string,
    highlights: PropTypes.arrayOf(PropTypes.string),
  }),
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

PackageDetailModal.defaultProps = {
  package: null,
};

export default PackageDetailModal;
