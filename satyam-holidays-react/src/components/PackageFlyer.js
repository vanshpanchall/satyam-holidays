// PackageFlyer — luxury-themed Instagram story flyer generator
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
