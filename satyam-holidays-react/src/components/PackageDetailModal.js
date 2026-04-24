import React, { useState, useEffect, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { FaTimes, FaMapMarkerAlt, FaClock, FaStar, FaRupeeSign, FaCheck } from "react-icons/fa";
import ReviewsSection from "./ReviewsSection";
import Meta from "./Meta";
import { motion, AnimatePresence } from "framer-motion";
import { resolveImageUrl, apiUrl } from "../config/siteConfig";
import { csrfFetch, refreshCsrfToken } from "../utils/csrf";

const scrollToEnquiry = () => {
  const el = document.getElementById("enquiry");
  if (el) el.scrollIntoView({ behavior: "smooth" });
};

const PackageDetailModal = ({ package: pkg = null, isOpen, onClose }) => {
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
      document.body.classList.add("modal-open");

      // Focus the close button when modal opens
      requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.classList.remove("modal-open");

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

  // Inject TouristTrip structured data (JSON-LD) for SEO when modal is open
  useEffect(() => {
    if (!isOpen || !pkg) return;

    const siteUrl = process.env.REACT_APP_SITE_URL || "https://satyamholidays.vercel.app";
    const pkgName = typeof pkg.name === "string" ? pkg.name : "Travel Package";
    const pkgLocation = typeof pkg.location === "string" ? pkg.location : "";
    const pkgPrice =
      pkg.numericPrice || parseInt(String(pkg.price || "0").replace(/[^\d]/g, ""), 10) || 0;

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "TouristTrip",
      name: pkgName,
      description: pkg.description || `${pkgName} tour package from Satyam Holidays`,
      touristType: pkg.category === "international" ? "International" : "Domestic",
      itinerary: {
        "@type": "ItemList",
        numberOfItems: pkg.duration || "N/A",
      },
      offers: {
        "@type": "Offer",
        price: pkgPrice,
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        seller: {
          "@type": "TravelAgency",
          name: "Satyam Holidays",
          url: siteUrl,
        },
      },
    };

    if (pkgLocation) {
      structuredData.location = {
        "@type": "Place",
        name: pkgLocation,
      };
    }

    if (pkg.image) {
      structuredData.image = resolveImageUrl(pkg.image);
    }

    if (pkg.rating) {
      structuredData.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: String(pkg.rating),
        reviewCount: String(pkg.reviews || 0),
        bestRating: "5",
        worstRating: "1",
      };
    }

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "tourist-trip-jsonld";
    script.textContent = JSON.stringify(structuredData);

    // Remove any previous instance
    const existing = document.getElementById("tourist-trip-jsonld");
    if (existing) existing.remove();

    document.head.appendChild(script);

    return () => {
      const el = document.getElementById("tourist-trip-jsonld");
      if (el) el.remove();
    };
  }, [isOpen, pkg]);

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
    { id: "enquiry", name: "Inquire Now" },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
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
                className="relative w-full max-w-6xl rounded-2xl max-h-[92vh] overflow-hidden shadow-glass-lg"
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
                <div className="relative h-44 sm:h-52 md:h-56 lg:h-60 overflow-hidden rounded-t-2xl">
                  <img
                    src={resolveImageUrl(pkg.image)}
                    alt={packageName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
                  <button
                    ref={closeButtonRef}
                    onClick={onClose}
                    className="absolute top-4 right-4 glass-badge p-2 rounded-full text-gray-700 dark:text-navy-200 hover:text-gray-900 dark:hover:text-white transition-colors"
                    aria-label="Close package details"
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 left-3 bg-primary-500 text-white px-3 py-1.5 rounded-full text-sm md:text-base font-medium shadow-lg">
                    <FaRupeeSign className="inline mr-1" />
                    {packagePrice.replace("₹", "")}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 md:p-6 max-h-[calc(92vh-260px)] overflow-y-auto">
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
                  <div className="min-h-[280px]">
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
                    {activeTab === "enquiry" && <ModalEnquiryForm pkg={pkg} />}
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
                    {activeTab !== "enquiry" && (
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            setActiveTab("enquiry");
                          }}
                          className="btn btn-secondary"
                        >
                          Customize Package
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab("enquiry");
                          }}
                          className="btn btn-primary"
                        >
                          Book Now
                        </button>
                      </div>
                    )}
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

const ModalEnquiryForm = ({ pkg }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    travelDate: "",
    travelers: "",
    budget: "",
    message: `Interested in package: ${pkg.name} (Duration: ${pkg.duration}, Price: ${pkg.price})`,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");
    setSuccess(false);

    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setErrorMsg("Name, email, and phone number are required.");
      setIsSubmitting(false);
      return;
    }

    try {
      const destinationMap = {
        chardham: "chardham",
        kashmir: "kashmir",
        andaman: "andaman",
        dubai: "dubai",
        singapore: "singapore",
        thailand: "thailand",
        vietnam: "vietnam",
        nepal: "nepal",
      };

      const sub = (pkg.subcategory || "").toLowerCase();
      let matchedDest = pkg.category || "custom";
      for (const key in destinationMap) {
        if (sub.includes(key)) {
          matchedDest = destinationMap[key];
          break;
        }
      }

      const payload = Object.fromEntries(
        Object.entries({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          destination: matchedDest,
          travelDate: formData.travelDate || undefined,
          travelers: formData.travelers || undefined,
          budget: formData.budget || undefined,
          message: formData.message || undefined,
        }).filter(([, v]) => v !== undefined && v !== null && v !== "")
      );

      const apiBase = apiUrl("").replace(/\/$/, "");
      await refreshCsrfToken(apiBase);

      const sendRequest = () =>
        csrfFetch(apiUrl("/api/enquiries"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

      let response = await sendRequest();
      let resJson = await response.json().catch(() => null);

      if (!response.ok && (resJson?.code === "CSRF_MISSING" || resJson?.code === "CSRF_INVALID")) {
        await refreshCsrfToken(apiBase);
        response = await sendRequest();
        resJson = await response.json().catch(() => null);
      }

      if (response.ok && resJson && resJson.success) {
        setSuccess(true);
      } else {
        setErrorMsg(resJson?.message || "Failed to submit enquiry. Please check fields.");
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-10 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-900 p-6">
        <h4 className="text-xl font-bold text-green-700 dark:text-green-400 mb-2">Enquiry Sent!</h4>
        <p className="text-green-600 dark:text-green-300">
          Thank you for your interest. We will contact you shortly about <strong>{pkg.name}</strong>
          .
        </p>
      </div>
    );
  }

  const inputStyle =
    "w-full px-4 py-2.5 border border-gray-300 dark:border-navy-600 rounded-lg bg-white/80 dark:bg-navy-800/60 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-gray-800 dark:text-white";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl mx-auto">
      {errorMsg && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
          {errorMsg}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-navy-300 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className={inputStyle}
            placeholder="Your Name"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-navy-300 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className={inputStyle}
            placeholder="name@example.com"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-navy-300 mb-1">
            Phone Number *
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            className={inputStyle}
            placeholder="Phone Number"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-navy-300 mb-1">
            Preferred Travel Date
          </label>
          <input
            type="date"
            name="travelDate"
            value={formData.travelDate}
            onChange={handleChange}
            className={inputStyle}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-navy-300 mb-1">
            Number of Travelers
          </label>
          <select
            name="travelers"
            value={formData.travelers}
            onChange={handleChange}
            className={inputStyle}
          >
            <option value="">Select number</option>
            <option value="1">1 Person</option>
            <option value="2">2 People</option>
            <option value="3">3 People</option>
            <option value="4">4 People</option>
            <option value="5+">5+ People</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-navy-300 mb-1">
            Budget Range
          </label>
          <select
            name="budget"
            value={formData.budget}
            onChange={handleChange}
            className={inputStyle}
          >
            <option value="">Select budget</option>
            <option value="under-20k">Under ₹20,000</option>
            <option value="20k-50k">₹20,000 - ₹50,000</option>
            <option value="50k-1l">₹50,000 - ₹1,00,000</option>
            <option value="above-1l">Above ₹1,00,000</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 dark:text-navy-300 mb-1">
          Additional Requirements
        </label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          rows="3"
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-navy-600 rounded-lg bg-white/80 dark:bg-navy-800/60 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm resize-none"
          placeholder="Travel details..."
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full btn btn-primary py-3 text-sm font-semibold disabled:opacity-50 min-h-[44px]"
      >
        {isSubmitting ? "Sending Enquiry..." : "Send Booking Enquiry"}
      </button>
    </form>
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

export default PackageDetailModal;
