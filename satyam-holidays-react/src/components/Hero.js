import React from "react";
import { FaPlane, FaMapMarkedAlt, FaHeart } from "react-icons/fa";
import { useSetting } from "../contexts/SettingsContext";

const StatCard = ({ stat, delay }) => {
  return (
    <div
      className="text-center glass-card rounded-2xl p-6 stat-card"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-4xl font-bold gradient-text mb-2">
        {stat.value}
        {stat.suffix}
      </div>
      <div className="text-navy-700 dark:text-navy-200 font-medium">{stat.label}</div>
    </div>
  );
};

const Hero = () => {
  const fallbackStats = [
    { value: 500, suffix: "+", label: "Happy Travelers" },
    { value: 50, suffix: "+", label: "Destinations" },
    { value: 10, suffix: "+", label: "Years Experience" },
  ];
  const rawStats = useSetting("hero.stats", fallbackStats);
  const rawHeroHeading = useSetting("hero.heading", "Discover Amazing Adventures With Us!");
  const rawHeroSubheading = useSetting(
    "hero.subheading",
    "Experience the world's most beautiful destinations with our carefully crafted travel packages. From spiritual journeys to exotic beaches, we make your dream vacation a reality."
  );

  const stats = Array.isArray(rawStats) ? rawStats : fallbackStats;
  const heroHeading =
    typeof rawHeroHeading === "string" ? rawHeroHeading : "Discover Amazing Adventures With Us!";
  const heroSubheading =
    typeof rawHeroSubheading === "string"
      ? rawHeroSubheading
      : "Experience the world's most beautiful destinations with our carefully crafted travel packages. From spiritual journeys to exotic beaches, we make your dream vacation a reality.";

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Split heading into lines for multi-line display
  const headingWords = heroHeading.split(" ");
  const midpoint = Math.ceil(headingWords.length / 2);
  const line1 = headingWords.slice(0, midpoint).join(" ");
  const line2 = headingWords.slice(midpoint).join(" ");

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 md:pt-28 lg:pt-32 scroll-mt-24 md:scroll-mt-28"
    >
      {/* Background with gradient and pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-cream to-navy-50 dark:from-navy-900 dark:via-navy-800 dark:to-navy-900"></div>
      <div className="absolute inset-0 bg-hero-pattern opacity-10"></div>
      <div className="absolute inset-0 mesh-gradient hidden md:block"></div>

      {/* Animated background orbs — CSS only */}
      <div
        className="absolute top-20 left-10 w-24 h-24 rounded-full animate-float opacity-40 hidden md:block"
        style={{
          background: "radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 70%)",
        }}
      ></div>
      <div
        className="absolute top-40 right-20 w-20 h-20 rounded-full animate-float opacity-35 hidden md:block"
        style={{
          animationDelay: "1s",
          background: "radial-gradient(circle, rgba(100,116,139,0.2) 0%, transparent 70%)",
        }}
      ></div>
      <div
        className="absolute bottom-40 left-20 w-16 h-16 rounded-full animate-float opacity-45 hidden md:block"
        style={{
          animationDelay: "2s",
          background: "radial-gradient(circle, rgba(245,158,11,0.3) 0%, transparent 70%)",
        }}
      ></div>

      {/* Main content */}
      <div className="container-custom relative z-10">
        <div className="text-center max-w-4xl mx-auto hero-content hero-content--visible">
          {/* Main heading */}
          <h1 className="text-4xl md:text-6xl font-bold text-navy-900 dark:text-white mb-6 leading-tight">
            <span className="block">{line1}</span>
            <span className="block gradient-text">{line2}</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-navy-700 dark:text-navy-200 mb-8 leading-relaxed">
            {heroSubheading}
          </p>

          {/* Call to action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              type="button"
              onClick={() => scrollToSection("packages")}
              className="btn btn-primary text-lg px-8 py-4 inline-flex items-center justify-center"
            >
              <FaPlane className="mr-2" />
              Plan Your Trip
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("enquiry")}
              className="btn btn-outline text-lg px-8 py-4 inline-flex items-center justify-center"
            >
              <FaMapMarkedAlt className="mr-2" />
              Enquiry Now
            </button>
          </div>

          {/* Stats section */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            {stats.map((stat, i) => (
              <StatCard key={stat.label} stat={stat} delay={i * 150} />
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce-slow"
        aria-hidden="true"
      >
        <div className="w-6 h-10 border-2 border-navy-400 dark:border-navy-500 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-navy-400 dark:bg-navy-500 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>

      {/* Floating glass elements */}
      <div className="absolute top-1/4 right-10 hidden lg:block">
        <div className="glass-card rounded-2xl p-6 animate-float">
          <FaHeart className="text-primary-500 text-2xl mb-2" />
          <p className="text-sm text-navy-700 dark:text-navy-200 font-medium">
            Trusted by {stats[0]?.value || 500}
            {stats[0]?.suffix || "+"} travelers
          </p>
        </div>
      </div>

      <div className="absolute bottom-1/4 left-10 hidden lg:block">
        <div className="glass-card rounded-2xl p-6 animate-float" style={{ animationDelay: "1s" }}>
          <FaPlane className="text-primary-500 text-2xl mb-2" />
          <p className="text-sm text-navy-700 dark:text-navy-200 font-medium">
            {stats[1]?.value || 50}
            {stats[1]?.suffix || "+"} destinations worldwide
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
