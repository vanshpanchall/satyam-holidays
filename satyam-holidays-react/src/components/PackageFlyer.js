// import { useRef, useState, useEffect } from "react";
// import { motion } from "framer-motion";
// import html2canvas from "html2canvas";
// import {
//   FaTimes,
//   FaMapMarkerAlt,
//   FaClock,
//   FaStar,
//   FaCheck,
//   FaPhone,
//   FaWhatsapp,
//   FaDownload,
//   FaPrint,
//   FaSpinner,
//   FaGlobe,
//   FaEnvelope,
// } from "react-icons/fa";
// import { resolveImageUrl } from "../config/siteConfig";
// import { useSiteConfig } from "../contexts/SettingsContext";

// const PackageFlyer = ({ pkg, onClose }) => {
//   const siteConfig = useSiteConfig();
//   const flyerRef = useRef(null);
//   const [isDownloading, setIsDownloading] = useState(false);

//   // Lock body scroll when modal is open
//   useEffect(() => {
//     const originalOverflow = document.body.style.overflow;
//     document.body.style.overflow = "hidden";
//     return () => {
//       document.body.style.overflow = originalOverflow;
//     };
//   }, []);

//   const handleDownload = async () => {
//     if (!flyerRef.current) return;
//     setIsDownloading(true);

//     try {
//       const canvas = await html2canvas(flyerRef.current, {
//         scale: 3, // High res for Instagram Story (1080x1920)
//         useCORS: true,
//         allowTaint: true,
//         backgroundColor: "#ffffff",
//         logging: false,
//         width: 360,
//         height: 640,
//       });

//       const link = document.createElement("a");
//       link.download = `${pkg.name.replace(/\s+/g, "-")}-Story.png`;
//       link.href = canvas.toDataURL("image/png", 1.0);
//       link.click();
//     } catch {
//       // Download failed silently
//     } finally {
//       setIsDownloading(false);
//     }
//   };

//   const handlePrint = () => {
//     const printContent = flyerRef.current;
//     const printWindow = window.open("", "_blank");
//     printWindow.document.write(`
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <title>${pkg.name} - Satyam Holidays</title>
//         <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
//         <style>
//           * { margin: 0; padding: 0; box-sizing: border-box; }
//           @page { size: 360px 640px; margin: 0; }
//           body { font-family: 'Poppins', sans-serif; display: flex; justify-content: center; }
//           @media print {
//             body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
//           }
//         </style>
//       </head>
//       <body>${printContent.outerHTML}</body>
//       </html>
//     `);
//     printWindow.document.close();
//     setTimeout(() => {
//       printWindow.print();
//       printWindow.close();
//     }, 500);
//   };

//   return (
//     <motion.div
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       exit={{ opacity: 0 }}
//       className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
//       style={{ overflow: "hidden" }}
//       onClick={onClose}
//     >
//       <div
//         className="flex flex-col items-center gap-4 max-h-full py-4"
//         style={{ overflow: "hidden" }}
//         onClick={(e) => e.stopPropagation()}
//       >
//         {/* Action Buttons */}
//         <div className="flex items-center justify-center gap-3 flex-shrink-0">
//           <button
//             onClick={handleDownload}
//             disabled={isDownloading}
//             className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-medium text-sm shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-70"
//           >
//             {isDownloading ? <FaSpinner className="animate-spin" /> : <FaDownload />}
//             {isDownloading ? "Generating..." : "Download"}
//           </button>
//           <button
//             onClick={handlePrint}
//             className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-medium text-sm shadow-lg shadow-amber-500/30 transition-all"
//           >
//             <FaPrint /> Print
//           </button>
//           <button
//             onClick={onClose}
//             className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
//           >
//             <FaTimes size={18} />
//           </button>
//         </div>

//         {/* Instagram Story Flyer — 9:16 aspect ratio (360×640 display, 1080×1920 export) */}
//         <div
//           ref={flyerRef}
//           style={{
//             width: "360px",
//             height: "640px",
//             fontFamily: "'Poppins', 'Segoe UI', sans-serif",
//             background: "#ffffff",
//             borderRadius: "12px",
//             overflow: "hidden",
//             boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
//             flexShrink: 0,
//             position: "relative",
//           }}
//         >
//           {/* Hero Section with Full Image — takes ~45% of story */}
//           <div style={{ position: "relative", height: "288px" }}>
//             <img
//               src={
//                 resolveImageUrl(pkg.image) ||
//                 "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800"
//               }
//               alt={pkg.name}
//               crossOrigin="anonymous"
//               style={{
//                 width: "100%",
//                 height: "100%",
//                 objectFit: "cover",
//               }}
//             />
//             {/* Gradient Overlay */}
//             <div
//               style={{
//                 position: "absolute",
//                 inset: 0,
//                 background:
//                   "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.85) 100%)",
//               }}
//             />

//             {/* Top Bar - Logo & Badge */}
//             <div
//               style={{
//                 position: "absolute",
//                 top: 0,
//                 left: 0,
//                 right: 0,
//                 padding: "12px 14px",
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "flex-start",
//               }}
//             >
//               {/* Logo */}
//               <div
//                 style={{
//                   background: "rgba(255,255,255,0.95)",
//                   borderRadius: "10px",
//                   padding: "8px 10px",
//                   display: "flex",
//                   alignItems: "center",
//                   gap: "8px",
//                   boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
//                 }}
//               >
//                 <img
//                   src={resolveImageUrl(siteConfig.company.logo) || "/satyam-logo.svg"}
//                   alt={siteConfig.company.name}
//                   crossOrigin="anonymous"
//                   style={{ height: "24px", width: "auto" }}
//                 />
//                 <div style={{ borderLeft: "1px solid #e5e7eb", paddingLeft: "8px" }}>
//                   <p
//                     style={{
//                       fontSize: "10px",
//                       fontWeight: "700",
//                       color: "#1e293b",
//                       margin: 0,
//                       lineHeight: 1.2,
//                     }}
//                   >
//                     {siteConfig.company.name}
//                   </p>
//                   <p style={{ fontSize: "7px", color: "#f59e0b", margin: 0, fontWeight: "500" }}>
//                     {siteConfig.company.tagline}
//                   </p>
//                 </div>
//               </div>

//               {/* Category Badge */}
//               <div
//                 style={{
//                   background: pkg.category === "international" ? "#8b5cf6" : "#10b981",
//                   color: "#fff",
//                   padding: "6px 12px",
//                   borderRadius: "16px",
//                   fontSize: "9px",
//                   fontWeight: "600",
//                   textTransform: "uppercase",
//                   letterSpacing: "0.5px",
//                   boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
//                 }}
//               >
//                 {pkg.category}
//               </div>
//             </div>

//             {/* Bottom Content - Package Name & Price */}
//             <div
//               style={{
//                 position: "absolute",
//                 bottom: 0,
//                 left: 0,
//                 right: 0,
//                 padding: "16px 14px",
//               }}
//             >
//               <div
//                 style={{
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "flex-end",
//                 }}
//               >
//                 <div style={{ flex: 1 }}>
//                   {pkg.subcategory && (
//                     <p
//                       style={{
//                         color: "#fbbf24",
//                         fontSize: "9px",
//                         fontWeight: "600",
//                         textTransform: "uppercase",
//                         letterSpacing: "1px",
//                         marginBottom: "4px",
//                       }}
//                     >
//                       {pkg.subcategory}
//                     </p>
//                   )}
//                   <h1
//                     style={{
//                       color: "#fff",
//                       fontSize: "20px",
//                       fontWeight: "700",
//                       margin: 0,
//                       lineHeight: 1.2,
//                       textShadow: "0 2px 10px rgba(0,0,0,0.3)",
//                     }}
//                   >
//                     {pkg.name}
//                   </h1>
//                 </div>

//                 {/* Price Tag */}
//                 <div
//                   style={{
//                     background: "#fff",
//                     borderRadius: "10px",
//                     padding: "8px 12px",
//                     textAlign: "center",
//                     marginLeft: "12px",
//                     boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
//                   }}
//                 >
//                   <p
//                     style={{
//                       fontSize: "7px",
//                       color: "#64748b",
//                       margin: 0,
//                       fontWeight: "500",
//                       textTransform: "uppercase",
//                     }}
//                   >
//                     Starting at
//                   </p>
//                   <p
//                     style={{
//                       fontSize: "16px",
//                       fontWeight: "800",
//                       color: "#ea580c",
//                       margin: "1px 0 0",
//                     }}
//                   >
//                     {pkg.price}
//                   </p>
//                   <p style={{ fontSize: "7px", color: "#94a3b8", margin: 0 }}>per person</p>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Info Cards Row */}
//           <div
//             style={{
//               display: "flex",
//               padding: "10px 14px",
//               gap: "8px",
//               background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
//             }}
//           >
//             {/* Duration */}
//             <div
//               style={{
//                 flex: 1,
//                 background: "#fff",
//                 borderRadius: "8px",
//                 padding: "8px 6px",
//                 textAlign: "center",
//                 boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
//               }}
//             >
//               <FaClock style={{ color: "#f59e0b", fontSize: "14px", marginBottom: "2px" }} />
//               <p
//                 style={{
//                   fontSize: "7px",
//                   color: "#64748b",
//                   margin: 0,
//                   fontWeight: "500",
//                   textTransform: "uppercase",
//                 }}
//               >
//                 Duration
//               </p>
//               <p
//                 style={{
//                   fontSize: "10px",
//                   color: "#1e293b",
//                   margin: "1px 0 0",
//                   fontWeight: "700",
//                 }}
//               >
//                 {pkg.duration}
//               </p>
//             </div>

//             {/* Location */}
//             <div
//               style={{
//                 flex: 1,
//                 background: "#fff",
//                 borderRadius: "8px",
//                 padding: "8px 6px",
//                 textAlign: "center",
//                 boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
//               }}
//             >
//               <FaMapMarkerAlt
//                 style={{ color: "#ef4444", fontSize: "14px", marginBottom: "2px" }}
//               />
//               <p
//                 style={{
//                   fontSize: "7px",
//                   color: "#64748b",
//                   margin: 0,
//                   fontWeight: "500",
//                   textTransform: "uppercase",
//                 }}
//               >
//                 Destination
//               </p>
//               <p
//                 style={{
//                   fontSize: "10px",
//                   color: "#1e293b",
//                   margin: "1px 0 0",
//                   fontWeight: "700",
//                 }}
//               >
//                 {pkg.location}
//               </p>
//             </div>

//             {/* Rating */}
//             <div
//               style={{
//                 flex: 1,
//                 background: "#fff",
//                 borderRadius: "8px",
//                 padding: "8px 6px",
//                 textAlign: "center",
//                 boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
//               }}
//             >
//               <FaStar style={{ color: "#fbbf24", fontSize: "14px", marginBottom: "2px" }} />
//               <p
//                 style={{
//                   fontSize: "7px",
//                   color: "#64748b",
//                   margin: 0,
//                   fontWeight: "500",
//                   textTransform: "uppercase",
//                 }}
//               >
//                 Rating
//               </p>
//               <p
//                 style={{
//                   fontSize: "10px",
//                   color: "#1e293b",
//                   margin: "1px 0 0",
//                   fontWeight: "700",
//                 }}
//               >
//                 {pkg.rating}/5 Stars
//               </p>
//             </div>
//           </div>

//           {/* Description */}
//           <div style={{ padding: "10px 14px 8px", background: "#fff" }}>
//             <p
//               style={{
//                 fontSize: "10px",
//                 color: "#475569",
//                 lineHeight: 1.6,
//                 margin: 0,
//                 textAlign: "center",
//                 display: "-webkit-box",
//                 WebkitLineClamp: 3,
//                 WebkitBoxOrient: "vertical",
//                 overflow: "hidden",
//               }}
//             >
//               {pkg.description}
//             </p>
//           </div>

//           {/* Highlights */}
//           {pkg.highlights && pkg.highlights.length > 0 && (
//             <div style={{ padding: "4px 14px 10px", background: "#fff" }}>
//               <h3
//                 style={{
//                   fontSize: "10px",
//                   fontWeight: "700",
//                   color: "#1e293b",
//                   marginBottom: "8px",
//                   textAlign: "center",
//                   textTransform: "uppercase",
//                   letterSpacing: "0.5px",
//                 }}
//               >
//                 <span style={{ borderBottom: "2px solid #f59e0b", paddingBottom: "2px" }}>
//                   Package Highlights
//                 </span>
//               </h3>
//               <div
//                 style={{
//                   display: "grid",
//                   gridTemplateColumns: "repeat(2, 1fr)",
//                   gap: "4px",
//                 }}
//               >
//                 {pkg.highlights.slice(0, 6).map((highlight, index) => (
//                   <div
//                     key={index}
//                     style={{
//                       display: "flex",
//                       alignItems: "center",
//                       gap: "6px",
//                       padding: "5px 8px",
//                       background: "#f8fafc",
//                       borderRadius: "6px",
//                       borderLeft: "2px solid #10b981",
//                     }}
//                   >
//                     <FaCheck style={{ color: "#10b981", fontSize: "7px", flexShrink: 0 }} />
//                     <span style={{ fontSize: "8px", color: "#334155", lineHeight: 1.3 }}>
//                       {highlight}
//                     </span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* CTA Banner */}
//           <div
//             style={{
//               background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
//               padding: "10px 14px",
//               textAlign: "center",
//             }}
//           >
//             <p
//               style={{
//                 color: "#fff",
//                 fontSize: "13px",
//                 fontWeight: "700",
//                 margin: "0 0 2px",
//                 textShadow: "0 1px 2px rgba(0,0,0,0.1)",
//               }}
//             >
//               Book Your Dream Vacation Today!
//             </p>
//             <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "8px", margin: 0 }}>
//               Limited slots available • Exclusive discounts for early bookings
//             </p>
//           </div>

//           {/* Footer - Contact Info */}
//           <div
//             style={{
//               background: "#1e293b",
//               padding: "12px 14px",
//               display: "flex",
//               justifyContent: "space-between",
//               alignItems: "center",
//               gap: "10px",
//             }}
//           >
//             {/* Contact Details */}
//             <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
//               <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//                 <div
//                   style={{
//                     width: "22px",
//                     height: "22px",
//                     background: "#f59e0b",
//                     borderRadius: "5px",
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                   }}
//                 >
//                   <FaPhone style={{ color: "#fff", fontSize: "9px" }} />
//                 </div>
//                 <span style={{ color: "#fff", fontSize: "10px", fontWeight: "500" }}>
//                   {siteConfig.company.phones[0]}
//                 </span>
//               </div>
//               <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//                 <div
//                   style={{
//                     width: "22px",
//                     height: "22px",
//                     background: "#22c55e",
//                     borderRadius: "5px",
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                   }}
//                 >
//                   <FaWhatsapp style={{ color: "#fff", fontSize: "10px" }} />
//                 </div>
//                 <span style={{ color: "#fff", fontSize: "10px", fontWeight: "500" }}>
//                   {siteConfig.company.whatsapp}
//                 </span>
//               </div>
//               <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//                 <div
//                   style={{
//                     width: "22px",
//                     height: "22px",
//                     background: "#3b82f6",
//                     borderRadius: "5px",
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                   }}
//                 >
//                   <FaEnvelope style={{ color: "#fff", fontSize: "10px" }} />
//                 </div>
//                 <span style={{ color: "#fff", fontSize: "9px", fontWeight: "500" }}>
//                   {siteConfig.company.email}
//                 </span>
//               </div>
//             </div>

//             {/* Logo & Website */}
//             <div style={{ textAlign: "center" }}>
//               <div
//                 style={{
//                   width: "44px",
//                   height: "44px",
//                   background: "#fff",
//                   borderRadius: "10px",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   padding: "6px",
//                   margin: "0 auto 4px",
//                   boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
//                 }}
//               >
//                 <img
//                   src={resolveImageUrl(siteConfig.company.logo) || "/satyam-logo.svg"}
//                   alt={siteConfig.company.name}
//                   crossOrigin="anonymous"
//                   style={{ width: "100%", height: "100%", objectFit: "contain" }}
//                 />
//               </div>
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   gap: "3px",
//                 }}
//               >
//                 <FaGlobe style={{ color: "#f59e0b", fontSize: "8px" }} />
//                 <span style={{ color: "#94a3b8", fontSize: "8px" }}>
//                   {(() => {
//                     try {
//                       return new URL(siteConfig.website || "https://satyamholidays.com").hostname;
//                     } catch {
//                       return "satyamholidays.com";
//                     }
//                   })()}
//                 </span>
//               </div>
//             </div>
//           </div>

//           {/* Bottom Strip */}
//           <div
//             style={{
//               background: "#0f172a",
//               padding: "6px 14px",
//               display: "flex",
//               justifyContent: "space-between",
//               alignItems: "center",
//             }}
//           >
//             <p style={{ color: "#64748b", fontSize: "7px", margin: 0 }}>
//               {siteConfig.company.address.line1}, {siteConfig.company.address.line2}
//             </p>
//             <p style={{ color: "#64748b", fontSize: "7px", margin: 0 }}>*T&C Apply</p>
//           </div>
//         </div>
//       </div>
//     </motion.div>
//   );
// };

// export default PackageFlyer;
import { useRef, useState, useEffect } from "react";
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

/* ─── Google Fonts ────────────────────────────────────────────────────────── */
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Raleway:wght@300;400;500;600;700&display=swap";

/* ─── Design tokens ───────────────────────────────────────────────────────── */
const T = {
  navy0: "#030508",
  navy1: "#060810",
  navy2: "#0A0E1A",
  navy3: "#0D1220",
  navy4: "#111627",
  navy5: "#141B2E",
  gold: "#C9A84C",
  goldLt: "#E8C96A",
  cream: "#F5F0E8",
  border: "rgba(201,168,76,0.18)",
  borderSm: "rgba(201,168,76,0.10)",
  textMd: "rgba(245,240,232,0.75)",
  textDim: "rgba(245,240,232,0.45)",
  textGhost: "rgba(245,240,232,0.25)",
};

const serif = "'Playfair Display', Georgia, serif";
const sans = "'Raleway', 'Segoe UI', sans-serif";
const goldGrad = `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLt} 50%, ${T.gold} 100%)`;
const goldStrip = `linear-gradient(90deg, transparent 0%, ${T.gold} 20%, ${T.goldLt} 50%, ${T.gold} 80%, transparent 100%)`;

/* ─── Component ───────────────────────────────────────────────────────────── */
const PackageFlyer = ({ pkg, onClose }) => {
  const siteConfig = useSiteConfig();
  const flyerRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  /* Inject Google Fonts once */
  useEffect(() => {
    if (!document.querySelector("[data-lux-fonts]")) {
      const link = Object.assign(document.createElement("link"), {
        rel: "stylesheet",
        href: FONT_HREF,
      });
      link.dataset.luxFonts = "1";
      document.head.appendChild(link);
    }
  }, []);

  /* Lock body scroll */
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, []);

  const handleDownload = async () => {
    if (!flyerRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(flyerRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: T.navy2,
        logging: false,
        width: 360,
        height: 640,
      });
      const link = document.createElement("a");
      link.download = `${pkg.name.replace(/\s+/g, "-")}-Story.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
    } catch {
      /* silent */
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head>
      <title>${pkg.name} – ${siteConfig.company.name}</title>
      <link rel="stylesheet" href="${FONT_HREF}">
      <style>*{margin:0;padding:0;box-sizing:border-box}
      @page{size:360px 640px;margin:0}
      body{font-family:'Raleway',sans-serif;display:flex;justify-content:center}
      @media print{body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
      </style></head><body>${flyerRef.current.outerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => {
      win.print();
      win.close();
    }, 600);
  };

  /* ── helpers ── */
  const hostname = () => {
    try {
      return new URL(siteConfig.website || "https://satyamholidays.com").hostname;
    } catch {
      return "satyamholidays.com";
    }
  };

  /* ── styles ── */
  const s = {
    /* overlay + scroll wrapper */
    overlay: {
      fontFamily: sans,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "20px",
      maxHeight: "100%",
      padding: "20px 16px",
      overflow: "hidden",
    },

    /* action buttons */
    actions: {
      display: "flex",
      gap: "12px",
      flexShrink: 0,
      flexWrap: "wrap",
      justifyContent: "center",
    },
    btnDl: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px 22px",
      borderRadius: "50px",
      border: "none",
      background: goldGrad,
      color: T.navy2,
      fontFamily: sans,
      fontSize: "13px",
      fontWeight: 700,
      letterSpacing: "0.4px",
      cursor: "pointer",
      boxShadow: "0 4px 20px rgba(201,168,76,0.4)",
    },
    btnPrint: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px 22px",
      borderRadius: "50px",
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.18)",
      color: "#fff",
      fontFamily: sans,
      fontSize: "13px",
      fontWeight: 600,
      cursor: "pointer",
    },
    btnClose: {
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      border: "1px solid rgba(255,255,255,0.18)",
      background: "rgba(255,255,255,0.08)",
      color: "#fff",
      fontSize: "17px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
    },

    /* flyer shell */
    flyer: {
      width: "360px",
      height: "640px",
      flexShrink: 0,
      borderRadius: "16px",
      overflow: "hidden",
      position: "relative",
      background: T.navy2,
      boxShadow: `0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px ${T.border}`,
    },

    /* ── HERO ── */
    hero: { position: "relative", height: "252px", overflow: "hidden" },
    heroImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
    heroGrad: {
      position: "absolute",
      inset: 0,
      background: `linear-gradient(180deg,
        rgba(10,14,26,0.18) 0%,
        rgba(10,14,26,0.08) 35%,
        rgba(10,14,26,0.62) 65%,
        rgba(10,14,26,0.97) 100%)`,
    },
    heroTint: {
      position: "absolute",
      inset: 0,
      background: "linear-gradient(135deg, rgba(201,168,76,0.07) 0%, transparent 55%)",
    },

    /* top bar – now only the new logo with a subtle background */
    topBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      padding: "14px 16px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    logoWrap: {
      background: "rgba(10,14,26,0.65)",
      backdropFilter: "blur(10px)",
      borderRadius: "8px",
      padding: "6px 12px",
      display: "flex",
      alignItems: "center",
    },
    newLogo: { height: "28px", width: "auto", objectFit: "contain" },
    catBadge: {
      padding: "5px 12px",
      borderRadius: "20px",
      border: `1px solid rgba(201,168,76,0.45)`,
      background: "rgba(201,168,76,0.12)",
      fontSize: "8px",
      fontWeight: 700,
      color: T.goldLt,
      textTransform: "uppercase",
      letterSpacing: "1.5px",
    },

    /* hero bottom */
    heroBottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 16px 16px" },
    subLabel: {
      fontSize: "8px",
      fontWeight: 600,
      color: T.gold,
      textTransform: "uppercase",
      letterSpacing: "2px",
      marginBottom: "6px",
    },
    heroRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end" },
    pkgName: {
      fontFamily: serif,
      fontSize: "23px",
      fontWeight: 700,
      color: "#fff",
      lineHeight: 1.15,
      textShadow: "0 2px 16px rgba(0,0,0,0.55)",
      flex: 1,
    },
    priceCard: {
      marginLeft: "14px",
      background: "rgba(10,14,26,0.82)",
      backdropFilter: "blur(10px)",
      border: `1px solid ${T.border}`,
      borderRadius: "10px",
      padding: "8px 13px",
      textAlign: "center",
    },
    priceFrom: {
      fontSize: "7px",
      color: "rgba(232,201,106,0.55)",
      textTransform: "uppercase",
      letterSpacing: "0.8px",
    },
    priceAmt: {
      fontFamily: serif,
      fontSize: "18px",
      fontWeight: 700,
      color: T.goldLt,
      margin: "2px 0",
    },
    pricePp: { fontSize: "7px", color: "rgba(255,255,255,0.35)" },

    /* gold divider */
    goldStrip: { height: "3px", background: goldStrip },

    /* info row */
    infoRow: {
      display: "flex",
      background: T.navy4,
      borderBottom: `1px solid ${T.borderSm}`,
    },
    infoCell: (last) => ({
      flex: 1,
      padding: "10px 6px",
      textAlign: "center",
      borderRight: last ? "none" : `1px solid ${T.borderSm}`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "3px",
    }),
    infoIconWrap: { fontSize: "13px", marginBottom: "1px" },
    infoLabel: {
      fontSize: "7px",
      fontWeight: 700,
      color: "rgba(201,168,76,0.55)",
      textTransform: "uppercase",
      letterSpacing: "1px",
    },
    infoVal: { fontSize: "9px", fontWeight: 700, color: T.cream, letterSpacing: "0.2px" },

    /* description */
    descSection: {
      background: T.navy3,
      padding: "11px 18px 10px",
      borderBottom: `1px solid ${T.borderSm}`,
    },
    descText: {
      fontFamily: serif,
      fontStyle: "italic",
      fontSize: "10px",
      color: "rgba(245,240,232,0.68)",
      lineHeight: 1.65,
      textAlign: "center",
      display: "-webkit-box",
      WebkitLineClamp: 3,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
    },

    /* highlights */
    hlSection: { background: T.navy3, padding: "10px 16px 11px" },
    hlHeader: {
      display: "flex",
      alignItems: "center",
      gap: "9px",
      marginBottom: "9px",
      justifyContent: "center",
    },
    hlLine: (flip) => ({
      flex: 1,
      height: "1px",
      background: flip
        ? "linear-gradient(270deg, transparent, rgba(201,168,76,0.28))"
        : "linear-gradient(90deg, transparent, rgba(201,168,76,0.28))",
    }),
    hlTitle: {
      fontSize: "8px",
      fontWeight: 700,
      color: T.gold,
      textTransform: "uppercase",
      letterSpacing: "2px",
    },
    hlGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" },
    hlItem: {
      display: "flex",
      alignItems: "flex-start",
      gap: "7px",
      padding: "6px 8px",
      background: "rgba(201,168,76,0.055)",
      border: `1px solid rgba(201,168,76,0.12)`,
      borderRadius: "6px",
    },
    hlCheck: {
      width: "14px",
      height: "14px",
      minWidth: "14px",
      background: goldGrad,
      borderRadius: "3px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "7px",
      color: T.navy2,
      fontWeight: 700,
    },
    hlText: { fontSize: "8px", color: "rgba(245,240,232,0.8)", lineHeight: 1.4, fontWeight: 500 },

    /* CTA */
    ctaSection: {
      position: "relative",
      background: `linear-gradient(135deg, ${T.navy2} 0%, ${T.navy5} 100%)`,
      padding: "11px 18px",
      borderTop: `1px solid ${T.border}`,
      borderBottom: `1px solid ${T.border}`,
      textAlign: "center",
      overflow: "hidden",
    },
    ctaGlow: {
      position: "absolute",
      top: "-28px",
      left: "50%",
      transform: "translateX(-50%)",
      width: "220px",
      height: "60px",
      background: "radial-gradient(ellipse, rgba(201,168,76,0.14) 0%, transparent 70%)",
      pointerEvents: "none",
    },
    ctaHead: {
      fontFamily: serif,
      fontSize: "13.5px",
      fontWeight: 600,
      color: T.goldLt,
      letterSpacing: "0.2px",
      marginBottom: "2px",
      position: "relative",
    },
    ctaSub: {
      fontSize: "8px",
      color: T.textDim,
      fontWeight: 500,
      letterSpacing: "0.3px",
      position: "relative",
    },

    /* footer – redesigned: full logo on left, contact details on right */
    footer: {
      background: T.navy1,
      padding: "14px 16px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    footerLogo: {
      height: "32px",
      width: "auto",
      objectFit: "contain",
    },
    contactCol: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      alignItems: "flex-end",
    },
    contactItem: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      flexDirection: "row-reverse" /* icon after text for neat alignment */,
    },
    cIconBase: {
      width: "24px",
      height: "24px",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      fontSize: "11px",
    },
    cText: {
      fontSize: "10px",
      fontWeight: 500,
      color: T.textMd,
      whiteSpace: "nowrap",
    },

    /* bottom strip */
    bottomStrip: {
      background: T.navy0,
      padding: "5px 16px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    addrTxt: { fontSize: "7px", color: T.textGhost, letterSpacing: "0.2px" },
  };

  /* Helper to get the logo URL */
  const getNewLogoUrl = () => {
    return resolveImageUrl(siteConfig.company.logo) || "/satyam-logo.svg";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
      onClick={onClose}
    >
      <div style={s.overlay} onClick={(e) => e.stopPropagation()}>
        {/* Action Buttons */}
        <div style={s.actions}>
          <button style={s.btnDl} onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? (
              <FaSpinner style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <FaDownload size={11} />
            )}
            {isDownloading ? "Generating…" : "Download Story"}
          </button>
          <button style={s.btnPrint} onClick={handlePrint}>
            <FaPrint size={11} /> Print
          </button>
          <button style={s.btnClose} onClick={onClose}>
            <FaTimes size={15} />
          </button>
        </div>

        {/* ── FLYER 360 × 640 ── */}
        <div ref={flyerRef} style={s.flyer}>
          {/* HERO */}
          <div style={s.hero}>
            <img
              src={
                resolveImageUrl(pkg.image) ||
                "https://images.unsplash.com/photo-1506461883276-594a12b11cf3?w=720"
              }
              alt={pkg.name}
              crossOrigin="anonymous"
              style={s.heroImg}
            />
            <div style={s.heroGrad} />
            <div style={s.heroTint} />

            {/* Top Bar – only the new logo (no text) */}
            <div style={s.topBar}>
              <div style={s.logoWrap}>
                <img src={getNewLogoUrl()} alt="Satyam Holidays" style={s.newLogo} />
              </div>
              <div style={s.catBadge}>{pkg.category}</div>
            </div>

            {/* Hero Bottom */}
            <div style={s.heroBottom}>
              {pkg.subcategory && <div style={s.subLabel}>✦ &nbsp;{pkg.subcategory}</div>}
              <div style={s.heroRow}>
                <div style={s.pkgName}>{pkg.name}</div>
                <div style={s.priceCard}>
                  <div style={s.priceFrom}>Starting at</div>
                  <div style={s.priceAmt}>{pkg.price}</div>
                  <div style={s.pricePp}>per person</div>
                </div>
              </div>
            </div>
          </div>

          {/* Gold divider */}
          <div style={s.goldStrip} />

          {/* INFO ROW */}
          <div style={s.infoRow}>
            <div style={s.infoCell(false)}>
              <FaClock style={{ color: T.gold, fontSize: "13px" }} />
              <div style={s.infoLabel}>Duration</div>
              <div style={s.infoVal}>{pkg.duration}</div>
            </div>
            <div style={s.infoCell(false)}>
              <FaMapMarkerAlt style={{ color: "#e05252", fontSize: "13px" }} />
              <div style={s.infoLabel}>Destination</div>
              <div style={s.infoVal}>{pkg.location}</div>
            </div>
            <div style={s.infoCell(true)}>
              <FaStar style={{ color: T.goldLt, fontSize: "13px" }} />
              <div style={s.infoLabel}>Rating</div>
              <div style={s.infoVal}>{pkg.rating}/5 Stars</div>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div style={s.descSection}>
            <p style={s.descText}>{pkg.description}</p>
          </div>

          {/* HIGHLIGHTS */}
          {pkg.highlights?.length > 0 && (
            <div style={s.hlSection}>
              <div style={s.hlHeader}>
                <div style={s.hlLine(false)} />
                <div style={s.hlTitle}>Package Highlights</div>
                <div style={s.hlLine(true)} />
              </div>
              <div style={s.hlGrid}>
                {pkg.highlights.slice(0, 6).map((h, i) => (
                  <div key={i} style={s.hlItem}>
                    <div style={s.hlCheck}>
                      <FaCheck style={{ fontSize: "6px" }} />
                    </div>
                    <span style={s.hlText}>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div style={s.ctaSection}>
            <div style={s.ctaGlow} />
            <div style={s.ctaHead}>Reserve Your Dream Vacation Today</div>
            <div style={s.ctaSub}>
              Limited availability &nbsp;•&nbsp; Exclusive early-bird savings
            </div>
          </div>

          {/* FOOTER – new layout: logo left, contact details right */}
          <div style={s.footer}>
            <img src={getNewLogoUrl()} alt="Satyam Holidays" style={s.footerLogo} />
            <div style={s.contactCol}>
              <div style={s.contactItem}>
                <span style={s.cText}>{siteConfig.company.phones[0]}</span>
                <div style={{ ...s.cIconBase, background: goldGrad }}>
                  <FaPhone style={{ color: T.navy2, fontSize: "10px" }} />
                </div>
              </div>
              <div style={s.contactItem}>
                <span style={s.cText}>{siteConfig.company.whatsapp}</span>
                <div style={{ ...s.cIconBase, background: "#25D366" }}>
                  <FaWhatsapp style={{ color: "#fff", fontSize: "11px" }} />
                </div>
              </div>
              <div style={s.contactItem}>
                <span style={{ ...s.cText, fontSize: "9.5px" }}>{siteConfig.company.email}</span>
                <div style={{ ...s.cIconBase, background: "#4A90D9" }}>
                  <FaEnvelope style={{ color: "#fff", fontSize: "10px" }} />
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM STRIP */}
          <div style={s.bottomStrip}>
            <span style={s.addrTxt}>
              {siteConfig.company.address.line1}, {siteConfig.company.address.line2}
            </span>
            <span style={s.addrTxt}>* T&C Apply</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PackageFlyer;
