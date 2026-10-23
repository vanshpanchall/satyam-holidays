import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PiArrowRight, PiHeart, PiList, PiPhone, PiX } from "react-icons/pi";
import { useSetting, useSiteConfig } from "../contexts/SettingsContext";
import { useWishlist } from "../utils/savedTrips";
import { toTel, toWhatsApp } from "../utils/format";
import ThemeToggle from "./ThemeToggle";
import { ScrollArea } from "./ui/Scrollbar";

export const NAV_LINKS = [
  { label: "Packages", to: "/packages" },
  { label: "India", to: "/packages?category=domestic" },
  { label: "International", to: "/packages?category=international" },
  { label: "Trip planner", to: "/ai-planner" },
  { label: "About", to: "/#about" },
  { label: "Contact", to: "/#contact" },
];

const ANNOUNCEMENT_DISMISS_KEY = "announcementDismissed";

const AnnouncementBar = () => {
  const enabled = useSetting("announcement.enabled");
  const text = useSetting("announcement.text");
  const link = useSetting("announcement.link");
  const linkLabel = useSetting("announcement.linkLabel");
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(ANNOUNCEMENT_DISMISS_KEY) === text;
    } catch {
      return false;
    }
  });

  if (!enabled || !text || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(ANNOUNCEMENT_DISMISS_KEY, text);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative bg-ink-900 text-[13px] text-white/85">
      <div className="container-site flex min-h-[38px] items-center justify-center gap-3 py-2 pr-10 text-center">
        <span className="hidden h-1.5 w-1.5 shrink-0 rounded-full bg-saffron-400 sm:block" />
        <p className="text-pretty">
          {text}
          {link && (
            <Link
              to={link}
              className="ml-2 font-medium text-white underline-offset-4 hover:underline"
            >
              {linkLabel || "Learn more"} →
            </Link>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-white/60 hover:text-white"
      >
        <PiX className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

const Wordmark = ({ light }) => {
  const siteConfig = useSiteConfig();
  return (
    <Link to="/" className="flex items-center gap-3" aria-label={`${siteConfig.company.name} home`}>
      <img
        src={siteConfig.company.logo}
        alt=""
        className="h-10 w-10 rounded-full bg-white object-contain p-1"
        width="40"
        height="40"
      />
      <span className="leading-none">
        <span
          className={`block font-display text-[1.35rem] tracking-tight ${
            light ? "text-white" : "text-fg"
          }`}
        >
          {siteConfig.company.name}
        </span>
        <span
          className={`mt-1 hidden text-[10px] uppercase tracking-[0.22em] sm:block ${
            light ? "text-white/70" : "text-muted"
          }`}
        >
          {siteConfig.company.tagline}
        </span>
      </span>
    </Link>
  );
};

const Header = ({ overlay = false }) => {
  const siteConfig = useSiteConfig();
  const { ids: wishlist } = useWishlist();
  const location = useLocation();
  const headerRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Expose header height to CSS so pages can offset their content correctly
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return undefined;
    const update = () =>
      document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`);
    update();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    document.body.classList.add("modal-open");
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const transparent = overlay && !scrolled && !menuOpen;
  const phone = siteConfig.company.phones[0];

  const current = location.pathname + location.search;
  const linkClass = (to) => {
    const active = current === to;
    if (transparent)
      return `text-[14px] transition-colors ${active ? "text-white" : "text-white/80 hover:text-white"}`;
    return `text-[14px] transition-colors ${active ? "text-fg" : "text-muted hover:text-fg"}`;
  };

  return (
    <>
      <header
        ref={headerRef}
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
          transparent
            ? "border-b border-transparent bg-transparent"
            : "border-b border-line bg-page/85 backdrop-blur-xl"
        }`}
      >
        <AnnouncementBar />
        <div className="container-site flex h-[4.5rem] items-center justify-between gap-6">
          <Wordmark light={transparent} />

          <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className={linkClass(link.to)}
                aria-current={current === link.to ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={toTel(phone)}
              className={`mr-2 hidden items-center gap-2 text-sm xl:flex ${
                transparent ? "text-white/85 hover:text-white" : "text-muted hover:text-fg"
              }`}
            >
              <PiPhone className="h-4 w-4" />
              {phone}
            </a>
            <Link
              to="/wishlist"
              className={`icon-btn relative ${transparent ? "border-white/30 text-white" : ""}`}
              aria-label={`Wishlist (${wishlist.length} saved)`}
            >
              <PiHeart className="h-[18px] w-[18px]" />
              {wishlist.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-saffron-500 px-1 text-[10px] font-semibold text-white">
                  {wishlist.length}
                </span>
              )}
            </Link>
            <ThemeToggle
              className={`icon-btn hidden sm:inline-flex ${
                transparent ? "border-white/30 text-white" : ""
              }`}
            />
            <Link
              to="/#enquiry"
              className={`btn ml-1 hidden md:inline-flex ${transparent ? "btn-light" : "btn-ink"}`}
            >
              Plan a trip
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className={`icon-btn lg:hidden ${transparent ? "border-white/30 text-white" : ""}`}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <PiX className="h-5 w-5" /> : <PiList className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={`fixed inset-0 z-40 bg-page transition-[opacity,visibility] duration-300 lg:hidden ${
          menuOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
        aria-hidden={!menuOpen}
      >
        <ScrollArea
          className="h-full"
          viewportProps={{ style: { paddingTop: "calc(var(--header-h) + 1.5rem)" } }}
          contentClassName="container-site flex min-h-full flex-col pb-8"
        >
          <nav aria-label="Mobile" className="flex flex-col">
            {NAV_LINKS.map((link, i) => (
              <Link
                key={link.label}
                to={link.to}
                tabIndex={menuOpen ? 0 : -1}
                className="group flex items-center justify-between border-b border-line py-4 font-display text-3xl text-fg"
                style={{ transitionDelay: menuOpen ? `${i * 40}ms` : "0ms" }}
              >
                {link.label}
                <PiArrowRight className="h-5 w-5 text-muted transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
            <Link
              to="/wishlist"
              tabIndex={menuOpen ? 0 : -1}
              className="flex items-center justify-between border-b border-line py-4 font-display text-3xl text-fg"
            >
              Saved trips
              <span className="font-sans text-sm text-muted">{wishlist.length}</span>
            </Link>
          </nav>

          <div className="mt-auto grid gap-3 pt-10">
            <Link
              to="/#enquiry"
              tabIndex={menuOpen ? 0 : -1}
              className="btn btn-accent btn-lg w-full"
            >
              Plan a trip with us
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <a href={toTel(phone)} tabIndex={menuOpen ? 0 : -1} className="btn btn-ghost w-full">
                Call
              </a>
              <a
                href={toWhatsApp(siteConfig.company.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={menuOpen ? 0 : -1}
                className="btn btn-ghost w-full"
              >
                WhatsApp
              </a>
            </div>
            <div className="flex items-center justify-between pt-4 text-sm text-muted">
              <span>Appearance</span>
              <ThemeToggle />
            </div>
          </div>
        </ScrollArea>
      </div>
    </>
  );
};

export default Header;
