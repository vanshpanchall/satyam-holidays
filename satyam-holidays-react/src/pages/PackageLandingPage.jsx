import React, { useState, useEffect, Suspense, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ReviewList from "../components/ReviewList";
import ReviewForm from "../components/ReviewForm";
import OptimizedImage from "../components/OptimizedImage";
import { toast } from "react-toastify";
import {
  apiUrl,
  resolveImageUrl,
  fetchWithAuth,
  toastApiError,
  safeJson,
} from "../config/siteConfig";
import { PackageDetailSkeleton } from "../components/SkeletonLoaders";
import {
  FaMapMarkerAlt,
  FaClock,
  FaHeart,
  FaShareAlt,
  FaPlus,
  FaCheckCircle,
  FaSpinner,
  FaPercent,
  FaPassport,
  FaShieldAlt,
  FaChevronDown,
} from "react-icons/fa";
import { lazyWithRecovery } from "../utils/lazyWithRecovery";

const ReCAPTCHA = lazyWithRecovery(() => import("react-google-recaptcha"), "enquiry-recaptcha");
const HCaptcha = lazyWithRecovery(() => import("@hcaptcha/react-hcaptcha"), "enquiry-hcaptcha");

const PackageLandingPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pricing calculator state
  const [selectedDate, setSelectedDate] = useState("");
  const [travelersCount, setTravelersCount] = useState(2);
  const [promoCode, setPromoCode] = useState("");
  const [priceData, setPriceData] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [insuranceEnabled, setInsuranceEnabled] = useState(false);
  const [visaRequested, setVisaRequested] = useState(false);

  // Wishlist state
  const [inWishlist, setInWishlist] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState("itinerary");

  // Itinerary expand State
  const [expandedDays, setExpandedDays] = useState([1]); // Day 1 expanded by default
  const toggleDayExpand = (dayNum) => {
    if (expandedDays.includes(dayNum)) {
      setExpandedDays(expandedDays.filter((d) => d !== dayNum));
    } else {
      setExpandedDays([...expandedDays, dayNum]);
    }
  };

  // Booking Enquiry form state
  const [enquiryName, setEnquiryName] = useState("");
  const [enquiryEmail, setEnquiryEmail] = useState("");
  const [enquiryPhone, setEnquiryPhone] = useState("");
  const [enquiryMsg, setEnquiryMsg] = useState("");
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const recaptchaRef = useRef(null);

  const PROVIDER = (process.env.REACT_APP_CAPTCHA_PROVIDER || "recaptcha_v2").toLowerCase();
  const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || "";
  const HCAPTCHA_SITE_KEY = process.env.REACT_APP_HCAPTCHA_SITE_KEY || "";
  const useCaptcha =
    (PROVIDER.startsWith("hcaptcha") && HCAPTCHA_SITE_KEY) ||
    (PROVIDER.startsWith("recaptcha") && RECAPTCHA_SITE_KEY);

  useEffect(() => {
    const controller = new AbortController();
    const fetchPackage = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(apiUrl(`/api/v1/packages/slug/${slug}`), {
          signal: controller.signal,
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setPkg(json.data);

            // Check wishlist
            const savedWishlist = localStorage.getItem("wishlist");
            if (savedWishlist) {
              const ids = JSON.parse(savedWishlist);
              setInWishlist(ids.includes(json.data._id || json.data.id));
            }
          } else {
            throw new Error("Failed to resolve package details");
          }
        } else {
          throw new Error("Package not found");
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error(err);
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    fetchPackage();
    return () => {
      controller.abort();
    };
  }, [slug]);

  // Inject Structured Schema (JSON-LD)
  useEffect(() => {
    if (!pkg) return;

    const schemaId = "structured-package-schema";
    let script = document.getElementById(schemaId);
    if (!script) {
      script = document.createElement("script");
      script.id = schemaId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }

    const priceNum = parseFloat(pkg.price?.replace(/[^\d]/g, "") || "10000");

    const schema = {
      "@context": "https://schema.org",
      "@type": "TouristTrip",
      name: pkg.name,
      description: pkg.description,
      touristType: "Sightseeing",
      itinerary: pkg.itinerary?.map((day) => ({
        "@type": "TouristAttraction",
        name: day.title,
        description: day.description,
      })),
      offers: {
        "@type": "Offer",
        price: priceNum,
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        seller: {
          "@type": "TravelAgency",
          name: "Satyam Holidays",
          url: "https://satyamholidays.com",
        },
      },
    };

    script.textContent = JSON.stringify(schema);

    return () => {
      const existing = document.getElementById(schemaId);
      if (existing) {
        existing.remove();
      }
    };
  }, [pkg]);

  // Recalculate price when variables change
  useEffect(() => {
    if (!pkg) return;
    const controller = new AbortController();

    const calculatePrice = async () => {
      setCalcLoading(true);
      try {
        const res = await fetchWithAuth(
          apiUrl(`/api/v1/packages/${pkg._id || pkg.id}/calculate-price`),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              date: selectedDate,
              travelersCount,
              promoCode,
            }),
            signal: controller.signal,
          }
        );
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setPriceData(json.data);
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Price calculation error", err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCalcLoading(false);
        }
      }
    };

    const timer = setTimeout(calculatePrice, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [pkg, selectedDate, travelersCount, promoCode]);

  const handleWishlistToggle = () => {
    if (!pkg) return;
    const pkgId = pkg._id || pkg.id;
    const saved = localStorage.getItem("wishlist");
    let ids = saved ? JSON.parse(saved) : [];

    if (inWishlist) {
      ids = ids.filter((id) => id !== pkgId);
      setInWishlist(false);
    } else {
      ids.push(pkgId);
      setInWishlist(true);
    }
    localStorage.setItem("wishlist", JSON.stringify(ids));
  };

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    if (!enquiryName || !enquiryPhone || !enquiryEmail) {
      toast.error("Name, email, and phone number are required.");
      return;
    }

    setEnquirySubmitting(true);
    setEnquirySuccess(false);

    try {
      // For reCAPTCHA v3, execute invisible challenge to retrieve token at submit time
      let currentToken = captchaToken;
      if (PROVIDER === "recaptcha_v3" && RECAPTCHA_SITE_KEY && recaptchaRef.current) {
        try {
          const v3Token = await recaptchaRef.current.executeAsync();
          currentToken = v3Token || "";
          setCaptchaToken(currentToken);
        } catch (_) {
          // ignore
        }
      }

      if (useCaptcha && !currentToken) {
        throw new Error("CAPTCHA verification is required. Please solve the CAPTCHA.");
      }

      const payload = {
        name: enquiryName,
        email: enquiryEmail,
        phone: enquiryPhone,
        destination: pkg.category === "domestic" ? "domestic" : "international",
        travelDate: selectedDate || undefined,
        travelers: travelersCount.toString(),
        budget: pkg.category === "international" ? "50k-1l" : "20k-50k",
        message: `${enquiryMsg}\n\n[Inquired via Package Page: ${pkg.name}]\n- Dynamic Price Total: INR ${finalDisplayPrice}\n- Insurance Requested: ${insuranceEnabled ? "Yes" : "No"}\n- Visa Help Requested: ${visaRequested ? "Yes" : "No"}`,
        visaRequired: visaRequested,
        travelInsurance: insuranceEnabled,
        referralCodeUsed: promoCode || undefined,
        captchaToken: currentToken || undefined,
      };

      const res = await fetchWithAuth(apiUrl("/api/v1/enquiries"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await safeJson(res);
      if (res.ok && json.success) {
        setEnquirySuccess(true);
        setEnquiryName("");
        setEnquiryEmail("");
        setEnquiryPhone("");
        setEnquiryMsg("");
        setCaptchaToken("");
        toast.success("Enquiry submitted successfully!");
      } else {
        toastApiError(json, "Failed to submit booking enquiry");
      }
    } catch (err) {
      console.error(err);
      toastApiError(err, "Failed to submit booking enquiry");
    } finally {
      setEnquirySubmitting(false);
    }
  };

  if (loading) return <PackageDetailSkeleton />;
  if (error || !pkg) {
    return (
      <>
        <Header />
        <div className="min-h-screen pt-40 pb-20 text-center max-w-md mx-auto px-4">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">Package Not Found</h2>
          <p className="text-gray-500 mb-6">
            The holiday package details could not be resolved. It may have been disabled or deleted.
          </p>
          <Link
            to="/"
            className="btn btn-primary bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md"
          >
            Go to Homepage
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  // Insurance pricing
  const insuranceRate = pkg.category === "international" ? 1999 : 499;
  const insuranceCost = insuranceEnabled ? insuranceRate * travelersCount : 0;

  // Final calculated total price
  const baseCost = priceData
    ? priceData.finalTotalPrice
    : parseFloat(pkg.price?.replace(/[^\d]/g, "") || "0") * travelersCount;
  const finalDisplayPrice = baseCost + insuranceCost;

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-28 lg:pb-16 dark:bg-navy-950">
        {/* Banner Section */}
        <div className="relative h-[60vh] w-full overflow-hidden">
          <OptimizedImage
            src={resolveImageUrl(pkg.image)}
            alt={pkg.name}
            className="w-full h-full object-cover transform scale-102 hover:scale-105 transition-transform duration-[6000ms] ease-out"
            aspectRatio="16/9"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/45 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 pt-20 pb-16 bg-gradient-to-t from-navy-950 to-transparent">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/20 border border-amber-500/35 text-amber-500 dark:text-amber-400 text-xs font-bold uppercase tracking-wider rounded-full backdrop-blur-md mb-4 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                {pkg.category} • {pkg.subcategory}
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mb-4 drop-shadow-md">
                {pkg.name}
              </h1>
              <div className="flex flex-wrap gap-5 text-xs md:text-sm font-semibold text-gray-300 items-center">
                <span className="flex items-center">
                  <FaMapMarkerAlt className="text-amber-500 mr-2 text-base" /> {pkg.location}
                </span>
                <span className="flex items-center">
                  <FaClock className="text-amber-500 mr-2 text-base" /> {pkg.duration}
                </span>
                {pkg.visa && (
                  <span className="flex items-center">
                    <FaPassport className="text-amber-500 mr-2 text-base" /> Visa: {pkg.visa}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions (Wishlist & Share) float top right */}
          <div className="absolute top-8 right-4 md:right-8 flex gap-3.5 z-10">
            <button
              onClick={handleWishlistToggle}
              className={`p-3.5 rounded-2xl backdrop-blur-md border flex items-center justify-center transition-all duration-300 shadow-lg ${
                inWishlist
                  ? "bg-rose-500 text-white border-rose-600 scale-105"
                  : "bg-black/45 border-white/20 text-white hover:bg-black/60 hover:scale-105"
              }`}
              title={inWishlist ? "Saved to Wishlist" : "Save to Wishlist"}
            >
              <FaHeart className="text-base" />
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Link copied to clipboard!");
              }}
              className="p-3.5 rounded-2xl bg-black/45 border border-white/20 text-white hover:bg-black/60 hover:scale-105 backdrop-blur-md flex items-center justify-center transition-all duration-300 shadow-lg"
              title="Share Package"
            >
              <FaShareAlt className="text-base" />
            </button>
          </div>
        </div>

        {/* Quick Facts Strip (Floating Overlay) */}
        <div className="-mt-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-30">
          <div className="bg-white/95 dark:bg-navy-900/95 backdrop-blur-xl border border-gray-150 dark:border-navy-800 p-5 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
              <div className="flex items-center space-x-3.5 px-3 md:px-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-500 rounded-2xl border border-amber-500/10">
                  <FaClock className="text-lg" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-navy-450">
                    Duration
                  </p>
                  <p className="text-sm font-extrabold text-navy-900 dark:text-white">
                    {pkg.duration}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3.5 px-3 md:px-4 md:border-l border-gray-100 dark:border-navy-800">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-2xl border border-indigo-500/10">
                  <FaMapMarkerAlt className="text-lg" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-navy-450">
                    Location
                  </p>
                  <p className="text-sm font-extrabold text-navy-900 dark:text-white">
                    {pkg.location}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3.5 px-3 md:px-4 md:border-l border-gray-100 dark:border-navy-800">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-2xl border border-emerald-500/10">
                  <FaPassport className="text-lg" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-navy-450">
                    Visa Requirements
                  </p>
                  <p className="text-sm font-extrabold text-navy-900 dark:text-white">
                    {pkg.visa || "Flexible Support"}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3.5 px-3 md:px-4 md:border-l border-gray-100 dark:border-navy-800">
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-2xl border border-rose-500/10">
                  <FaHeart className="text-lg" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-navy-450">
                    Tour Type
                  </p>
                  <p className="text-sm font-extrabold text-navy-900 dark:text-white capitalize">
                    {pkg.category} Holiday
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Core Layout Split */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
          {/* Details & Itinerary Side */}
          <div className="lg:col-span-2 space-y-8 text-left">
            {/* Tabs Segment Control */}
            <div className="flex space-x-1 p-1 bg-gray-100/80 dark:bg-navy-900/80 rounded-full backdrop-blur-xl max-w-md border border-gray-200/50 dark:border-navy-800/50 shadow-inner">
              {["overview", "itinerary", "reviews"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 px-5 text-xs font-bold uppercase tracking-wider rounded-full transition-all duration-300 relative ${
                    activeTab === tab
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20 scale-102"
                      : "text-gray-500 hover:text-navy-900 dark:text-navy-355 dark:hover:text-white hover:bg-white/40 dark:hover:bg-navy-850/40"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="bg-white dark:bg-navy-900 border border-gray-150 dark:border-navy-850 p-6 sm:p-8 rounded-3xl space-y-8 shadow-sm">
                <div>
                  <h3 className="text-xl font-extrabold text-navy-950 dark:text-white mb-4">
                    About This Holiday
                  </h3>
                  <p className="text-gray-600 dark:text-navy-200 leading-relaxed text-sm whitespace-pre-line font-medium">
                    {pkg.description}
                  </p>
                </div>

                {/* Highlights Board */}
                {pkg.highlights && pkg.highlights.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-navy-850 pt-6">
                    <h3 className="text-lg font-extrabold text-navy-950 dark:text-white mb-4">
                      Package Highlights
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {pkg.highlights.map((h, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 text-sm text-gray-700 dark:text-navy-200 bg-gray-50/60 dark:bg-navy-850/40 p-4 rounded-2xl border border-gray-100 dark:border-navy-800/50 transition-all duration-300 hover:scale-102 shadow-sm"
                        >
                          <FaCheckCircle className="text-amber-500 flex-shrink-0 mt-0.5 text-base" />
                          <span className="font-semibold">{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expert Suggestions Box */}
                <div className="border-t border-gray-100 dark:border-navy-800 pt-6">
                  <h3 className="text-lg font-extrabold text-navy-950 dark:text-white mb-5 flex items-center gap-2">
                    <span className="text-amber-550">💡</span> Smart Suggestions & Expert Tips
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 bg-gradient-to-br from-amber-500/5 to-transparent rounded-2xl border-l-4 border-amber-500 border-y border-r border-gray-150 dark:border-navy-800 space-y-2.5 transition-all duration-300 hover:shadow-md">
                      <p className="text-xs uppercase font-extrabold tracking-wider text-amber-605 dark:text-amber-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-550"></span> Best Season
                      </p>
                      <p className="text-xs text-gray-600 dark:text-navy-300 leading-relaxed font-medium">
                        {pkg.location?.toLowerCase().includes("manali") ||
                        pkg.location?.toLowerCase().includes("kullu") ||
                        pkg.location?.toLowerCase().includes("shimla")
                          ? "March to June offers pleasant weather; December to February is best for experiencing snow."
                          : pkg.location?.toLowerCase().includes("kedarnath") ||
                              pkg.location?.toLowerCase().includes("chardham")
                            ? "May to June and September to October. Avoid monsoons (July-August) due to landslide risks."
                            : pkg.location?.toLowerCase().includes("sundarban")
                              ? "October to March. Winter is highly pleasant and optimal for wildlife spotting in the reserve."
                              : "Recommended to visit during the dry winter and pleasant spring months for the best experience."}
                      </p>
                    </div>

                    <div className="p-5 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-2xl border-l-4 border-indigo-500 border-y border-r border-gray-150 dark:border-navy-800 space-y-2.5 transition-all duration-300 hover:shadow-md">
                      <p className="text-xs uppercase font-extrabold tracking-wider text-indigo-650 dark:text-indigo-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Packing
                        Guide
                      </p>
                      <p className="text-xs text-gray-605 dark:text-navy-350 leading-relaxed font-medium">
                        {pkg.category === "international"
                          ? "Universal power adaptor, light layers for flights, comfortable walking sneakers, and copies of visa documents."
                          : pkg.location?.toLowerCase().includes("kedarnath") ||
                              pkg.location?.toLowerCase().includes("chardham")
                            ? "Heavy woolens, thermal wear, sturdy trekking boots, rain poncho, walking stick, and personal medication."
                            : "Comfortable breathable clothing, sunglasses, high SPF sunblock, travel water bottle, and light sports shoes."}
                      </p>
                    </div>

                    <div className="p-5 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-2xl border-l-4 border-emerald-500 border-y border-r border-gray-150 dark:border-navy-800 space-y-2.5 transition-all duration-300 hover:shadow-md">
                      <p className="text-xs uppercase font-extrabold tracking-wider text-emerald-650 dark:text-emerald-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-550"></span> Expert Tip
                      </p>
                      <p className="text-xs text-gray-605 dark:text-navy-355 leading-relaxed font-medium">
                        {pkg.location?.toLowerCase().includes("kedarnath") ||
                        pkg.location?.toLowerCase().includes("chardham")
                          ? "Start your trek extremely early (around 4:00 AM) to avoid midday heat and arrive before afternoon clouds gather."
                          : "Carry local currency in cash as smaller vendors or remote stops do not always accept cards or UPI."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Itinerary Tab */}
            {activeTab === "itinerary" && (
              <div className="bg-white dark:bg-navy-900 border border-gray-150 dark:border-navy-850 p-6 sm:p-8 rounded-3xl space-y-8 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-extrabold text-navy-950 dark:text-white">
                    Day-by-Day Schedule
                  </h3>
                  {pkg.itinerary && pkg.itinerary.length > 0 && (
                    <button
                      onClick={() => {
                        const allDaysExpanded = expandedDays.length === pkg.itinerary.length;
                        if (allDaysExpanded) {
                          setExpandedDays([]);
                        } else {
                          setExpandedDays(pkg.itinerary.map((d) => d.day));
                        }
                      }}
                      className="text-[10px] uppercase font-bold tracking-wider text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 px-3.5 py-2 rounded-xl transition-all"
                    >
                      {expandedDays.length === pkg.itinerary.length ? "Collapse All" : "Expand All"}
                    </button>
                  )}
                </div>
                {pkg.itinerary && pkg.itinerary.length > 0 ? (
                  <div className="relative before:absolute before:left-[22px] before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-amber-500 before:via-orange-550 before:to-transparent space-y-6">
                    {pkg.itinerary.map((day) => {
                      const isExpanded = expandedDays.includes(day.day);
                      return (
                        <div key={day.day} className="relative pl-14 group">
                          {/* Timeline node */}
                          <button
                            onClick={() => toggleDayExpand(day.day)}
                            className={`absolute left-[6px] top-1.5 w-8.5 h-8.5 rounded-full font-black flex items-center justify-center text-xs shadow-md border-2 transition-all duration-350 z-10 ${
                              isExpanded
                                ? "bg-gradient-to-r from-amber-500 to-orange-550 border-amber-600 text-white scale-110 shadow-lg shadow-amber-500/30"
                                : "bg-white dark:bg-navy-850 border-gray-300 dark:border-navy-750 text-gray-500 dark:text-navy-350 group-hover:border-amber-500 group-hover:text-amber-500 group-hover:scale-105"
                            }`}
                          >
                            {day.day}
                          </button>

                          {/* Day Card */}
                          <div
                            className={`p-6 rounded-3xl border transition-all duration-355 ${
                              isExpanded
                                ? "bg-white dark:bg-navy-900/90 backdrop-blur-xl border-amber-500/25 dark:border-amber-500/15 shadow-xl shadow-amber-500/5 transform translate-x-1"
                                : "bg-white/50 dark:bg-navy-900/30 border-gray-150 dark:border-navy-850 hover:bg-white dark:hover:bg-navy-900/50 hover:border-gray-250 hover:translate-x-0.5"
                            }`}
                          >
                            <div
                              className="flex items-center justify-between cursor-pointer select-none"
                              onClick={() => toggleDayExpand(day.day)}
                            >
                              <h4 className="text-sm sm:text-base font-extrabold text-navy-900 dark:text-white group-hover:text-amber-550 transition-colors flex items-center gap-2">
                                <span>Day {day.day}:</span>
                                <span className="font-semibold text-gray-750 dark:text-navy-150">
                                  {day.title}
                                </span>
                              </h4>
                              <span
                                className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full border transition-all duration-300 ${
                                  isExpanded
                                    ? "text-amber-550 bg-amber-500/10 border-amber-500/20"
                                    : "text-gray-400 bg-gray-50 dark:bg-navy-850 border-gray-200 dark:border-navy-800 group-hover:text-amber-550 group-hover:bg-amber-500/5 group-hover:border-amber-500/10"
                                } ml-4 flex-shrink-0`}
                              >
                                {isExpanded ? "Collapse" : "Expand"}
                              </span>
                            </div>

                            {/* Collapsible Content */}
                            {isExpanded && (
                              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-navy-800/80 space-y-4 animate-fadeIn">
                                <p className="text-sm text-gray-600 dark:text-navy-200 leading-relaxed font-medium">
                                  {day.description}
                                </p>

                                {day.meals && day.meals.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-2.5 pt-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                      Meals Included:
                                    </span>
                                    <div className="flex gap-1.5 flex-wrap">
                                      {day.meals.map((meal, mIdx) => (
                                        <span
                                          key={mIdx}
                                          className="px-3 py-1 text-[10px] rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-550/20 shadow-sm"
                                        >
                                          🍽️ {meal}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-10 border border-dashed rounded-3xl text-center bg-gray-50/50 dark:bg-navy-850/30 text-gray-500 border-gray-200 dark:border-navy-800">
                    Daily itinerary details are being updated. Check back shortly or submit an
                    enquiry for the full schedule!
                  </div>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === "reviews" && (
              <div className="bg-white dark:bg-navy-900 border border-gray-150 dark:border-navy-850 p-6 sm:p-8 rounded-3xl space-y-8 shadow-sm">
                <div>
                  <h3 className="text-xl font-extrabold text-navy-950 dark:text-white mb-4">
                    Customer Reviews
                  </h3>
                  <ReviewList packageId={pkg._id || pkg.id} />
                </div>
                <div className="border-t border-gray-150 dark:border-navy-800 pt-8">
                  <h3 className="text-lg font-extrabold text-navy-950 dark:text-white mb-4">
                    Leave a Review
                  </h3>
                  <ReviewForm packageId={pkg._id || pkg.id} />
                </div>
              </div>
            )}
          </div>

          {/* Pricing Calculator & Enquiry Form Sidebar */}
          <div
            className="lg:col-span-1 space-y-6 lg:sticky lg:top-28 scroll-mt-28"
            id="booking-sidebar-section"
          >
            {/* Price Estimator Widget */}
            <div className="bg-white/80 dark:bg-navy-900/80 backdrop-blur-xl p-6 rounded-3xl border border-amber-500/20 dark:border-amber-500/10 text-left shadow-xl shadow-gray-200/30 dark:shadow-black/20 relative overflow-hidden transition-all duration-300 hover:shadow-2xl">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500"></div>
              <h3 className="text-lg font-extrabold text-navy-950 dark:text-white mb-5 flex items-center gap-2">
                <span className="text-amber-550">✨</span> Configure Booking
              </h3>

              <div className="space-y-4">
                {/* Date Dropdown */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-navy-400 mb-1.5">
                    Select Departure Date
                  </label>
                  {pkg.availableDates && pkg.availableDates.length > 0 ? (
                    <div className="relative">
                      <select
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full pl-3 pr-8 py-3 border border-gray-200 dark:border-navy-750 rounded-xl bg-gray-50/50 dark:bg-navy-850 outline-none text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 appearance-none font-semibold cursor-pointer transition-all duration-300"
                      >
                        <option value="">-- Choose departure --</option>
                        {pkg.availableDates
                          .filter((d) => d.status !== "sold_out")
                          .map((d, i) => (
                            <option key={i} value={d.startDate}>
                              {new Date(d.startDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                              {d.priceOverride ? ` (Override Price: ₹${d.priceOverride})` : ""}
                            </option>
                          ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                        <FaChevronDown className="text-[10px]" />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/5 dark:bg-amber-950/20 px-3.5 py-3.5 rounded-xl font-semibold border border-amber-500/10 shadow-inner">
                      Flexible Departure Dates (Enquire below)
                    </div>
                  )}
                </div>

                {/* Travelers counter & Promo Code Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-navy-400 mb-1.5">
                      Travelers
                    </label>
                    <div className="flex items-center border border-gray-200 dark:border-navy-750 rounded-xl overflow-hidden bg-gray-50/50 dark:bg-navy-850 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500 transition-all duration-300">
                      <button
                        type="button"
                        onClick={() => setTravelersCount(Math.max(1, travelersCount - 1))}
                        className="px-3.5 py-2.5 hover:bg-gray-150 dark:hover:bg-navy-700 text-gray-500 dark:text-white font-extrabold text-sm transition-colors"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center font-extrabold text-xs text-navy-900 dark:text-white">
                        {travelersCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTravelersCount(travelersCount + 1)}
                        className="px-3.5 py-2.5 hover:bg-gray-150 dark:hover:bg-navy-700 text-gray-500 dark:text-white font-extrabold text-sm transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-navy-400 mb-1.5">
                      Promo Code
                    </label>
                    <div className="relative">
                      <FaPercent className="absolute left-3.5 top-3.5 text-gray-400 text-[10px]" />
                      <input
                        type="text"
                        placeholder="CODE"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        className="w-full pl-8 pr-3 py-3 border border-gray-200 dark:border-navy-750 rounded-xl bg-gray-50/50 dark:bg-navy-850 outline-none text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold uppercase tracking-wider transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Checkboxes Group */}
                <div className="space-y-3 pt-2">
                  {/* Optional Visa Checkbox */}
                  {pkg.visa && pkg.visa !== "Not Required" && (
                    <label className="flex items-center gap-3 cursor-pointer select-none group">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={visaRequested}
                          onChange={(e) => setVisaRequested(e.target.checked)}
                          className="rounded text-amber-500 focus:ring-amber-500 focus:ring-offset-0 h-4.5 w-4.5 border-gray-300 dark:border-navy-700 dark:bg-navy-850 cursor-pointer transition-all"
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-gray-650 dark:text-navy-200 flex items-center gap-1.5 group-hover:text-amber-500 transition-colors">
                        <FaPassport className="text-amber-500 text-sm" /> Request Visa Assistance
                      </span>
                    </label>
                  )}

                  {/* Optional Travel Insurance Checkbox */}
                  <label className="flex items-center gap-3 cursor-pointer select-none group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={insuranceEnabled}
                        onChange={(e) => setInsuranceEnabled(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-500 focus:ring-offset-0 h-4.5 w-4.5 border-gray-300 dark:border-navy-700 dark:bg-navy-850 cursor-pointer transition-all"
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-650 dark:text-navy-200 flex items-center gap-1.5 group-hover:text-amber-500 transition-colors">
                      <FaShieldAlt className="text-amber-500 text-sm" /> Add Travel Insurance (+₹
                      {insuranceRate}/person)
                    </span>
                  </label>
                </div>
              </div>

              {/* Price Details Summary Board */}
              <div className="mt-6 pt-5 border-t border-gray-150 dark:border-navy-800 space-y-2.5 text-[11px] font-medium">
                <div className="flex justify-between text-gray-500 dark:text-navy-450 font-bold">
                  <span>Unit Price:</span>
                  <span className="font-bold text-navy-900 dark:text-white">
                    ₹{priceData ? priceData.unitPrice.toLocaleString("en-IN") : pkg.price}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-navy-450">
                  <span>Subtotal ({travelersCount} travelers):</span>
                  <span className="font-bold text-navy-900 dark:text-white">
                    ₹
                    {(priceData
                      ? priceData.originalTotalPrice
                      : parseFloat(pkg.price?.replace(/[^\d]/g, "") || "0") * travelersCount
                    ).toLocaleString("en-IN")}
                  </span>
                </div>
                {priceData?.promoApplied && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/10">
                    <span>Discount ({priceData.discountPercent}%):</span>
                    <span>-₹{priceData.discountAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {insuranceEnabled && (
                  <div className="flex justify-between text-gray-500 dark:text-navy-450 font-bold">
                    <span>Travel Insurance:</span>
                    <span className="font-bold text-navy-900 dark:text-white">
                      +₹{insuranceCost.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-extrabold text-navy-950 dark:text-white pt-4 border-t border-dashed border-gray-200 dark:border-navy-800">
                  <span>Estimated Total:</span>
                  <span className="text-xl text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-550 font-black">
                    ₹{finalDisplayPrice.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Enquiry Booking form */}
            <div className="bg-white/80 dark:bg-navy-900/80 backdrop-blur-xl p-6 rounded-3xl border border-amber-500/20 dark:border-amber-500/10 text-left shadow-xl shadow-gray-200/30 dark:shadow-black/20 relative overflow-hidden transition-all duration-300 hover:shadow-2xl">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
              <h3 className="text-lg font-extrabold text-navy-950 dark:text-white mb-5 flex items-center gap-2">
                <span className="text-indigo-500">📅</span> Book This Holiday
              </h3>

              {enquirySuccess ? (
                <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl text-center space-y-3 animate-fadeIn">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl mx-auto shadow-md">
                    🎉
                  </div>
                  <h4 className="font-extrabold text-sm uppercase tracking-wider">
                    Enquiry Submitted!
                  </h4>
                  <p className="text-xs leading-relaxed text-gray-650 dark:text-navy-300">
                    Thank you! We've received your booking inquiry. Our team will review your
                    requirements and reach out within 2 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleEnquirySubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-navy-450 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter your name"
                      value={enquiryName}
                      onChange={(e) => setEnquiryName(e.target.value)}
                      className="w-full px-3.5 py-3 border border-gray-200 dark:border-navy-750 rounded-xl bg-gray-50/50 dark:bg-navy-850 outline-none text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-300 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-navy-450 mb-1.5">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="Enter phone number"
                        value={enquiryPhone}
                        onChange={(e) => setEnquiryPhone(e.target.value)}
                        className="w-full px-3.5 py-3 border border-gray-200 dark:border-navy-750 rounded-xl bg-gray-50/50 dark:bg-navy-850 outline-none text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-300 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-navy-450 mb-1.5">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="Enter email address"
                        value={enquiryEmail}
                        onChange={(e) => setEnquiryEmail(e.target.value)}
                        className="w-full px-3.5 py-3 border border-gray-200 dark:border-navy-750 rounded-xl bg-gray-50/50 dark:bg-navy-850 outline-none text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-300 font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-navy-450 mb-1.5">
                      Special Requests
                    </label>
                    <textarea
                      placeholder="e.g. Flight booking required, hotel category preference, extensions..."
                      value={enquiryMsg}
                      onChange={(e) => setEnquiryMsg(e.target.value)}
                      rows="3"
                      className="w-full p-3.5 border border-gray-250 dark:border-navy-700 rounded-xl bg-gray-50/50 dark:bg-navy-850 outline-none text-xs focus:ring-1 focus:ring-amber-500 transition-all font-semibold leading-relaxed"
                    />
                  </div>

                  {/* CAPTCHA */}
                  {useCaptcha ? (
                    <Suspense
                      fallback={
                        <p className="text-[10px] text-navy-600 dark:text-navy-300">
                          Loading CAPTCHA...
                        </p>
                      }
                    >
                      {PROVIDER === "hcaptcha" ? (
                        <div className="my-2">
                          <HCaptcha
                            sitekey={HCAPTCHA_SITE_KEY}
                            onVerify={(val) => setCaptchaToken(val || "")}
                            onExpire={() => setCaptchaToken("")}
                          />
                        </div>
                      ) : PROVIDER === "recaptcha_v3" ? (
                        <div className="my-2">
                          <ReCAPTCHA
                            ref={recaptchaRef}
                            sitekey={RECAPTCHA_SITE_KEY}
                            size="invisible"
                            onChange={(val) => setCaptchaToken(val || "")}
                          />
                          <p className="text-[9px] text-navy-500 dark:text-navy-450">
                            Protected by reCAPTCHA v3
                          </p>
                        </div>
                      ) : (
                        <div className="my-2 scale-90 origin-left">
                          <ReCAPTCHA
                            sitekey={RECAPTCHA_SITE_KEY}
                            onChange={(val) => setCaptchaToken(val || "")}
                            onExpired={() => setCaptchaToken("")}
                          />
                        </div>
                      )}
                    </Suspense>
                  ) : null}

                  <button
                    type="submit"
                    disabled={
                      enquirySubmitting ||
                      (PROVIDER !== "recaptcha_v3" && !!useCaptcha && !captchaToken)
                    }
                    className="w-full btn btn-primary bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all duration-300"
                  >
                    {enquirySubmitting ? (
                      <>
                        <FaSpinner className="animate-spin text-sm" /> Submitting Request...
                      </>
                    ) : (
                      "Submit Booking Request"
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Mobile Bottom Booking Bar */}
        <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white/95 dark:bg-navy-900/95 backdrop-blur-md border-t border-gray-150 dark:border-navy-850 p-4 flex items-center justify-between z-40 shadow-[0_-8px_30px_rgb(0,0,0,0.06)]">
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Estimated Total
            </p>
            <p className="text-xl font-extrabold text-amber-500">
              ₹{finalDisplayPrice.toLocaleString("en-IN")}
            </p>
          </div>
          <button
            onClick={() => {
              const element = document.getElementById("booking-sidebar-section");
              if (element) {
                element.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs rounded-xl shadow-md uppercase tracking-wider transition-all duration-300"
          >
            Configure & Book
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PackageLandingPage;
