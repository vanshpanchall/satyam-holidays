import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaBars, FaTimes, FaChevronDown, FaHeart, FaExchangeAlt, FaRobot } from "react-icons/fa";
import { useSiteConfig } from "../contexts/SettingsContext";
import ThemeToggle from "./ThemeToggle";

const Header = () => {
  const siteConfig = useSiteConfig();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);
  const dropdownRef = useRef(null);
  const bodyOverflowRef = useRef("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open + a11y focus trap & Escape close
  useEffect(() => {
    if (isMenuOpen) {
      bodyOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      // Focus first focusable element inside menu
      setTimeout(() => {
        const first = menuRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        first?.focus();
      }, 0);
      const onKeyDown = (e) => {
        if (e.key === "Escape") {
          setIsMenuOpen(false);
          menuButtonRef.current?.focus();
        }
        if (e.key === "Tab") {
          const focusable = menuRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (!focusable || focusable.length === 0) return;
          const firstEl = focusable[0];
          const lastEl = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          } else if (!e.shiftKey && document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      };
      document.addEventListener("keydown", onKeyDown);
      return () => {
        document.removeEventListener("keydown", onKeyDown);
      };
    } else {
      document.body.style.overflow = bodyOverflowRef.current || "";
      bodyOverflowRef.current = "";
    }
    return () => {
      if (document.body.style.overflow === "hidden") {
        document.body.style.overflow = bodyOverflowRef.current || "";
      }
      bodyOverflowRef.current = "";
    };
  }, [isMenuOpen]);

  // Click outside for dropdown and key close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const scrollToSection = useCallback(
    (sectionId) => {
      setIsMenuOpen(false);
      if (location.pathname !== "/") {
        navigate("/");
        setTimeout(() => {
          const element = document.getElementById(sectionId);
          if (element) {
            element.scrollIntoView({ behavior: "smooth" });
          }
        }, 300);
      } else {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    },
    [location.pathname, navigate]
  );

  return (
    <header
      className={`fixed left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled || location.pathname !== "/"
          ? "top-3 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
          : "top-0 py-2"
      }`}
    >
      <div
        className={`w-full transition-all duration-500 ${
          isScrolled || location.pathname !== "/"
            ? "glass-navbar-scrolled rounded-2xl shadow-glass border border-white/30 dark:border-navy-800/80 px-6"
            : "bg-transparent px-4 sm:px-6 lg:px-8"
        }`}
      >
        <div className="flex items-center justify-between py-3">
          {/* Logo */}
          <Link
            to="/"
            onClick={() => scrollToSection("home")}
            className="flex items-center space-x-3 group focus:outline-none rounded-xl p-2 logo-container-modern transition-all duration-300"
          >
            <div className="relative flex items-center justify-center p-1.5 rounded-2xl bg-gradient-to-tr from-amber-500/10 to-orange-600/10 dark:from-amber-500/20 dark:to-orange-600/20 border border-amber-500/20 group-hover:border-amber-500/50 transition-all duration-300 logo-wrapper-modern shadow-sm">
              {/* Logo Glow Ring */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 opacity-0 group-hover:opacity-25 blur-md transition-opacity duration-300"></div>

              <img
                src={siteConfig.company.logo}
                alt={`${siteConfig.company.name} logo`}
                className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-contain relative z-10 transition-transform duration-500 group-hover:scale-105 group-hover:rotate-[4deg]"
                loading="eager"
                decoding="async"
              />
            </div>

            <div className="flex flex-col text-left">
              <span className="text-xl md:text-2xl font-black tracking-tight leading-none text-navy-900 dark:text-white transition-colors duration-300">
                <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                  Satyam
                </span>
                <span className="text-navy-900 dark:text-gray-100 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">
                  {" "}
                  Holidays
                </span>
              </span>
              <span className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.25em] text-primary-500 dark:text-primary-400 mt-1.5 transition-all duration-300 group-hover:tracking-[0.28em]">
                {siteConfig.company.tagline}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <button
              onClick={() => scrollToSection("home")}
              className="nav-link-modern text-navy-700 dark:text-navy-200 hover:text-primary-600 dark:hover:text-primary-400"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("services")}
              className="nav-link-modern text-navy-700 dark:text-navy-200 hover:text-primary-600 dark:hover:text-primary-400"
            >
              Services
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className="nav-link-modern text-navy-700 dark:text-navy-200 hover:text-primary-600 dark:hover:text-primary-400"
            >
              About Us
            </button>
            <button
              onClick={() => scrollToSection("packages")}
              className="nav-link-modern text-navy-700 dark:text-navy-200 hover:text-primary-600 dark:hover:text-primary-400"
            >
              Packages
            </button>

            {/* Travel Hub Dropdown */}
            <div
              className="relative"
              ref={dropdownRef}
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="nav-link-modern flex items-center space-x-1.5 text-navy-700 dark:text-navy-200 hover:text-primary-600 dark:hover:text-primary-400 focus:outline-none py-2"
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
              >
                <span>Travel Hub</span>
                <FaChevronDown
                  className={`text-[10px] transition-transform duration-350 ${isDropdownOpen ? "rotate-180 text-amber-500" : ""}`}
                />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-1 w-80 rounded-2xl border border-gray-200 dark:border-navy-700 bg-white dark:bg-navy-900 p-2 shadow-2xl z-50 transform origin-top-right dropdown-animate">
                  <Link
                    to="/ai-planner"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-start p-3 rounded-xl dropdown-item-amber transition-all duration-200 group"
                  >
                    <div className="p-2.5 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg mr-3 transition-colors group-hover:bg-amber-500 group-hover:text-white">
                      <FaRobot className="text-lg" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-semibold text-navy-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        AI Trip Planner
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-navy-300 mt-0.5 leading-normal">
                        Generate custom, optimized day-by-day itineraries tailored to your style.
                      </p>
                    </div>
                  </Link>

                  <Link
                    to="/wishlist"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-start p-3 rounded-xl dropdown-item-rose transition-all duration-200 group"
                  >
                    <div className="p-2.5 bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg mr-3 transition-colors group-hover:bg-rose-500 group-hover:text-white">
                      <FaHeart className="text-lg" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-semibold text-navy-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                        Saved Wishlist
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-navy-300 mt-0.5 leading-normal">
                        Access and review your saved tour packages and favorite destinations.
                      </p>
                    </div>
                  </Link>

                  <Link
                    to="/compare"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-start p-3 rounded-xl dropdown-item-blue transition-all duration-200 group"
                  >
                    <div className="p-2.5 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg mr-3 transition-colors group-hover:bg-blue-500 group-hover:text-white">
                      <FaExchangeAlt className="text-lg" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-semibold text-navy-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        Compare Packages
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-navy-300 mt-0.5 leading-normal">
                        Compare prices, reviews, inclusions, and itineraries side-by-side.
                      </p>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            <button
              onClick={() => scrollToSection("contact")}
              className="nav-link-modern text-navy-700 dark:text-navy-200 hover:text-primary-600 dark:hover:text-primary-400"
            >
              Contact Us
            </button>
            <ThemeToggle />
            <button
              onClick={() => scrollToSection("enquiry")}
              className="btn btn-primary shadow-glow-primary"
            >
              Enquire Now
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-navy-100 dark:hover:bg-navy-800 transition-colors duration-300"
            ref={menuButtonRef}
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <FaTimes className="text-navy-700 dark:text-navy-200 text-xl" />
            ) : (
              <FaBars className="text-navy-700 dark:text-navy-200 text-xl" />
            )}
          </button>
        </div>

        {/* Mobile Navigation (full-screen overlay) */}
        {isMenuOpen && (
          <div
            className="fixed inset-0 z-[60] md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/30" onClick={() => setIsMenuOpen(false)} />
            {/* Panel */}
            <div
              ref={menuRef}
              className="absolute top-0 left-0 right-0 glass-light dark:glass-dark rounded-b-3xl shadow-glass p-6 pt-20 max-h-screen overflow-y-auto"
              tabIndex={-1}
            >
              {/* Internal close button for overlay */}
              <button
                aria-label="Close menu"
                onClick={() => setIsMenuOpen(false)}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-navy-50 dark:bg-navy-800 text-navy-700 dark:text-navy-200 hover:bg-navy-100 dark:hover:bg-navy-700"
              >
                <FaTimes />
              </button>
              <nav className="flex flex-col space-y-4">
                <button
                  onClick={() => scrollToSection("home")}
                  className="text-left text-navy-700 dark:text-navy-200 hover:text-primary-500 dark:hover:text-primary-400 font-medium transition-colors duration-300 py-2"
                >
                  Home
                </button>
                <button
                  onClick={() => scrollToSection("services")}
                  className="text-left text-navy-700 dark:text-navy-200 hover:text-primary-500 dark:hover:text-primary-400 font-medium transition-colors duration-300 py-2"
                >
                  Services
                </button>
                <button
                  onClick={() => scrollToSection("about")}
                  className="text-left text-navy-700 dark:text-navy-200 hover:text-primary-500 dark:hover:text-primary-400 font-medium transition-colors duration-300 py-2"
                >
                  About Us
                </button>
                <button
                  onClick={() => scrollToSection("packages")}
                  className="text-left text-navy-700 dark:text-navy-200 hover:text-primary-500 dark:hover:text-primary-400 font-medium transition-colors duration-300 py-2"
                >
                  Packages
                </button>
                {/* Mobile Travel Hub Section */}
                <div className="border-t border-navy-100 dark:border-navy-800/60 pt-3 mt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-navy-300 block mb-2 px-1">
                    Travel Hub
                  </span>
                  <div className="space-y-1 pl-1">
                    <Link
                      to="/ai-planner"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center space-x-3 text-navy-700 dark:text-navy-200 hover:text-amber-500 dark:hover:text-amber-400 py-2.5 transition-colors font-medium"
                    >
                      <span className="p-1.5 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-md">
                        <FaRobot className="text-sm" />
                      </span>
                      <span className="text-sm">AI Trip Planner</span>
                    </Link>
                    <Link
                      to="/wishlist"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center space-x-3 text-navy-700 dark:text-navy-200 hover:text-rose-500 dark:hover:text-rose-400 py-2.5 transition-colors font-medium"
                    >
                      <span className="p-1.5 bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-md">
                        <FaHeart className="text-sm" />
                      </span>
                      <span className="text-sm">Saved Wishlist</span>
                    </Link>
                    <Link
                      to="/compare"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center space-x-3 text-navy-700 dark:text-navy-200 hover:text-blue-500 dark:hover:text-blue-400 py-2.5 transition-colors font-medium"
                    >
                      <span className="p-1.5 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-md">
                        <FaExchangeAlt className="text-sm" />
                      </span>
                      <span className="text-sm">Compare Packages</span>
                    </Link>
                  </div>
                </div>
                <button
                  onClick={() => scrollToSection("contact")}
                  className="text-left text-navy-700 dark:text-navy-200 hover:text-primary-500 dark:hover:text-primary-400 font-medium transition-colors duration-300 py-2"
                >
                  Contact Us
                </button>
                <div className="flex items-center justify-between py-2">
                  <span className="text-navy-700 dark:text-navy-200 font-medium">Theme:</span>
                  <ThemeToggle />
                </div>
                <button
                  onClick={() => scrollToSection("enquiry")}
                  className="btn btn-primary w-full shadow-glow-primary"
                >
                  Enquire Now
                </button>
              </nav>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
