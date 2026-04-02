import { useRef, useState } from "react";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import {
  FaTimes,
  FaMapMarkerAlt,
  FaClock,
  FaStar,
  FaCheck,
  FaPhone,
  FaWhatsapp,
  FaDownload,
  FaPrint,
  FaSpinner,
  FaGlobe,
  FaEnvelope,
} from "react-icons/fa";
import { resolveImageUrl } from "../config/siteConfig";
import { useSiteConfig } from "../contexts/SettingsContext";

const PackageFlyer = ({ pkg, onClose }) => {
  const siteConfig = useSiteConfig();
  const flyerRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!flyerRef.current) return;
    setIsDownloading(true);

    try {
      const canvas = await html2canvas(flyerRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const link = document.createElement("a");
      link.download = `${pkg.name.replace(/\s+/g, "-")}-Flyer.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
    } catch {
      // Download failed silently
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    const printContent = flyerRef.current;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${pkg.name} - Satyam Holidays</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: A4; margin: 0; }
          body { font-family: 'Poppins', sans-serif; }
          @media print {
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        </style>
      </head>
      <body>${printContent.outerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 overflow-y-auto flyer-modal-scroll"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center p-6 py-12">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[480px]"
        >
          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-medium text-sm shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-70"
            >
              {isDownloading ? <FaSpinner className="animate-spin" /> : <FaDownload />}
              {isDownloading ? "Generating..." : "Download"}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-medium text-sm shadow-lg shadow-amber-500/30 transition-all"
            >
              <FaPrint /> Print
            </button>
            <button
              onClick={onClose}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
            >
              <FaTimes size={18} />
            </button>
          </div>

          {/* Flyer Content */}
          <div
            ref={flyerRef}
            style={{
              fontFamily: "'Poppins', 'Segoe UI', sans-serif",
              background: "#ffffff",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            {/* Hero Section with Full Image */}
            <div style={{ position: "relative", height: "280px" }}>
              <img
                src={
                  resolveImageUrl(pkg.image) ||
                  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800"
                }
                alt={pkg.name}
                crossOrigin="anonymous"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              {/* Gradient Overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.85) 100%)",
                }}
              />

              {/* Top Bar - Logo & Badge */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                {/* Logo */}
                <div
                  style={{
                    background: "rgba(255,255,255,0.95)",
                    borderRadius: "12px",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                  }}
                >
                  <img
                    src={resolveImageUrl(siteConfig.company.logo) || "/satyam-logo.svg"}
                    alt={siteConfig.company.name}
                    crossOrigin="anonymous"
                    style={{ height: "32px", width: "auto" }}
                  />
                  <div style={{ borderLeft: "1px solid #e5e7eb", paddingLeft: "10px" }}>
                    <p
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        color: "#1e293b",
                        margin: 0,
                        lineHeight: 1.2,
                      }}
                    >
                      {siteConfig.company.name}
                    </p>
                    <p style={{ fontSize: "9px", color: "#f59e0b", margin: 0, fontWeight: "500" }}>
                      {siteConfig.company.tagline}
                    </p>
                  </div>
                </div>

                {/* Category Badge */}
                <div
                  style={{
                    background: pkg.category === "international" ? "#8b5cf6" : "#10b981",
                    color: "#fff",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
                  }}
                >
                  {pkg.category}
                </div>
              </div>

              {/* Bottom Content - Package Name & Price */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    {pkg.subcategory && (
                      <p
                        style={{
                          color: "#fbbf24",
                          fontSize: "11px",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          marginBottom: "6px",
                        }}
                      >
                        {pkg.subcategory}
                      </p>
                    )}
                    <h1
                      style={{
                        color: "#fff",
                        fontSize: "26px",
                        fontWeight: "700",
                        margin: 0,
                        lineHeight: 1.2,
                        textShadow: "0 2px 10px rgba(0,0,0,0.3)",
                      }}
                    >
                      {pkg.name}
                    </h1>
                  </div>

                  {/* Price Tag */}
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: "12px",
                      padding: "12px 16px",
                      textAlign: "center",
                      marginLeft: "16px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "9px",
                        color: "#64748b",
                        margin: 0,
                        fontWeight: "500",
                        textTransform: "uppercase",
                      }}
                    >
                      Starting at
                    </p>
                    <p
                      style={{
                        fontSize: "22px",
                        fontWeight: "800",
                        color: "#ea580c",
                        margin: "2px 0 0",
                      }}
                    >
                      {pkg.price}
                    </p>
                    <p style={{ fontSize: "9px", color: "#94a3b8", margin: 0 }}>per person</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Cards Row */}
            <div
              style={{
                display: "flex",
                padding: "16px 20px",
                gap: "12px",
                background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
              }}
            >
              {/* Duration */}
              <div
                style={{
                  flex: 1,
                  background: "#fff",
                  borderRadius: "10px",
                  padding: "12px",
                  textAlign: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                }}
              >
                <FaClock style={{ color: "#f59e0b", fontSize: "20px", marginBottom: "4px" }} />
                <p
                  style={{
                    fontSize: "9px",
                    color: "#64748b",
                    margin: 0,
                    fontWeight: "500",
                    textTransform: "uppercase",
                  }}
                >
                  Duration
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#1e293b",
                    margin: "2px 0 0",
                    fontWeight: "700",
                  }}
                >
                  {pkg.duration}
                </p>
              </div>

              {/* Location */}
              <div
                style={{
                  flex: 1,
                  background: "#fff",
                  borderRadius: "10px",
                  padding: "12px",
                  textAlign: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                }}
              >
                <FaMapMarkerAlt
                  style={{ color: "#ef4444", fontSize: "20px", marginBottom: "4px" }}
                />
                <p
                  style={{
                    fontSize: "9px",
                    color: "#64748b",
                    margin: 0,
                    fontWeight: "500",
                    textTransform: "uppercase",
                  }}
                >
                  Destination
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#1e293b",
                    margin: "2px 0 0",
                    fontWeight: "700",
                  }}
                >
                  {pkg.location}
                </p>
              </div>

              {/* Rating */}
              <div
                style={{
                  flex: 1,
                  background: "#fff",
                  borderRadius: "10px",
                  padding: "12px",
                  textAlign: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                }}
              >
                <FaStar style={{ color: "#fbbf24", fontSize: "20px", marginBottom: "4px" }} />
                <p
                  style={{
                    fontSize: "9px",
                    color: "#64748b",
                    margin: 0,
                    fontWeight: "500",
                    textTransform: "uppercase",
                  }}
                >
                  Rating
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#1e293b",
                    margin: "2px 0 0",
                    fontWeight: "700",
                  }}
                >
                  {pkg.rating}/5 Stars
                </p>
              </div>
            </div>

            {/* Description */}
            <div style={{ padding: "20px", background: "#fff" }}>
              <p
                style={{
                  fontSize: "13px",
                  color: "#475569",
                  lineHeight: 1.7,
                  margin: 0,
                  textAlign: "center",
                }}
              >
                {pkg.description}
              </p>
            </div>

            {/* Highlights */}
            {pkg.highlights && pkg.highlights.length > 0 && (
              <div style={{ padding: "0 20px 20px", background: "#fff" }}>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "#1e293b",
                    marginBottom: "12px",
                    textAlign: "center",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  <span style={{ borderBottom: "3px solid #f59e0b", paddingBottom: "4px" }}>
                    Package Highlights
                  </span>
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "8px",
                  }}
                >
                  {pkg.highlights.slice(0, 6).map((highlight, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 12px",
                        background: "#f8fafc",
                        borderRadius: "8px",
                        borderLeft: "3px solid #10b981",
                      }}
                    >
                      <FaCheck style={{ color: "#10b981", fontSize: "10px", flexShrink: 0 }} />
                      <span style={{ fontSize: "11px", color: "#334155", lineHeight: 1.3 }}>
                        {highlight}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA Banner */}
            <div
              style={{
                background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                padding: "20px",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  color: "#fff",
                  fontSize: "18px",
                  fontWeight: "700",
                  margin: "0 0 4px",
                  textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                }}
              >
                Book Your Dream Vacation Today!
              </p>
              <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "12px", margin: 0 }}>
                Limited slots available • Exclusive discounts for early bookings
              </p>
            </div>

            {/* Footer - Contact Info */}
            <div
              style={{
                background: "#1e293b",
                padding: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
              }}
            >
              {/* Contact Details */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      background: "#f59e0b",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FaPhone style={{ color: "#fff", fontSize: "12px" }} />
                  </div>
                  <span style={{ color: "#fff", fontSize: "13px", fontWeight: "500" }}>
                    {siteConfig.company.phones[0]}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      background: "#22c55e",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FaWhatsapp style={{ color: "#fff", fontSize: "14px" }} />
                  </div>
                  <span style={{ color: "#fff", fontSize: "13px", fontWeight: "500" }}>
                    {siteConfig.company.whatsapp}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      background: "#3b82f6",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FaEnvelope style={{ color: "#fff", fontSize: "14px" }} />
                  </div>
                  <span style={{ color: "#fff", fontSize: "12px", fontWeight: "500" }}>
                    {siteConfig.company.email}
                  </span>
                </div>
              </div>

              {/* Logo & Website */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    background: "#fff",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "8px",
                    margin: "0 auto 8px",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
                  }}
                >
                  <img
                    src={resolveImageUrl(siteConfig.company.logo) || "/satyam-logo.svg"}
                    alt={siteConfig.company.name}
                    crossOrigin="anonymous"
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                  }}
                >
                  <FaGlobe style={{ color: "#f59e0b", fontSize: "12px" }} />
                  <span style={{ color: "#94a3b8", fontSize: "10px" }}>
                    {(() => {
                      try {
                        return new URL(siteConfig.website || "https://satyamholidays.com").hostname;
                      } catch {
                        return "satyamholidays.com";
                      }
                    })()}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Strip */}
            <div
              style={{
                background: "#0f172a",
                padding: "10px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <p style={{ color: "#64748b", fontSize: "9px", margin: 0 }}>
                {siteConfig.company.address.line1}, {siteConfig.company.address.line2}
              </p>
              <p style={{ color: "#64748b", fontSize: "9px", margin: 0 }}>*T&C Apply</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default PackageFlyer;
