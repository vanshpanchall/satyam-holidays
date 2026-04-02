import React, { useState, useEffect, useRef } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { useSiteConfig } from "../contexts/SettingsContext";
import ThemeToggle from "./ThemeToggle";

const Header = () => {
  const siteConfig = useSiteConfig();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open + a11y focus trap & Escape close
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (isMenuOpen) {
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
      return () => document.removeEventListener("keydown", onKeyDown);
    } else {
      document.body.style.overflow = prev || "";
    }
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [isMenuOpen]);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? "glass-navbar shadow-glass" : "bg-transparent"
      }`}
    >
      <div className="container-custom">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img
              src={siteConfig.company.logo}
              alt={`${siteConfig.company.name} logo`}
              className="w-12 h-12 md:w-16 md:h-16 rounded-lg shadow-sm object-contain"
              loading="eager"
              decoding="async"
            />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-navy-900 dark:text-white">
                {siteConfig.company.name}
              </h1>
              <p className="text-xs md:text-sm text-primary-500 dark:text-primary-400 font-medium">
                {siteConfig.company.tagline}
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => scrollToSection("home")}
              className="text-navy-700 dark:text-navy-200 hover:text-primary-500 dark:hover:text-primary-400 font-medium transition-colors duration-300"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("services")}
              className="text-navy-700 dark:text-navy-200 hover:text-primary-500 dark:hover:text-primary-400 font-medium transition-colors duration-300"
            >
              Services
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className="text-navy-700 dark:text-navy-200 hover:text-primary-500 dark:hover:text-primary-400 font-medium transition-colors duration-300"
            >
              About Us
            </button>
            <button
              onClick={() => scrollToSection("packages")}
              className="text-navy-700 dark:text-navy-200 hover:text-primary-500 dark:hover:text-primary-400 font-medium transition-colors duration-300"
            >
              Packages
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className="text-navy-700 dark:text-navy-200 hover:text-primary-500 dark:hover:text-primary-400 font-medium transition-colors duration-300"
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
