import React from "react";
import { FaPlane, FaMapMarkedAlt, FaHeart } from "react-icons/fa";
import { motion, useScroll, useTransform } from "framer-motion";
import { fadeUp, stagger } from "../utils/motion";

const Hero = () => {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const { scrollY } = useScroll();
  const yBg = useTransform(scrollY, [0, 1000], [0, 300]);
  const yText = useTransform(scrollY, [0, 1000], [0, 150]);
  const yOrbs = useTransform(scrollY, [0, 1000], [0, -200]);

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 md:pt-28 lg:pt-32 scroll-mt-24 md:scroll-mt-28"
    >
      {/* Background with gradient and pattern */}
      <motion.div
        style={{ y: yBg }}
        className="absolute inset-0 bg-gradient-to-br from-primary-50 via-cream to-navy-50 dark:from-navy-900 dark:via-navy-800 dark:to-navy-900"
      ></motion.div>
      <motion.div
        style={{ y: yBg }}
        className="absolute inset-0 bg-hero-pattern opacity-10"
      ></motion.div>
      <div className="absolute inset-0 mesh-gradient"></div>

      {/* Animated background orbs */}
      <motion.div
        style={{
          y: yOrbs,
          background: "radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 70%)",
        }}
        className="absolute top-20 left-10 w-24 h-24 rounded-full animate-float opacity-40"
        aria-hidden="true"
      ></motion.div>
      <motion.div
        className="absolute top-40 right-20 w-20 h-20 rounded-full animate-float opacity-35"
        style={{
          y: yOrbs,
          animationDelay: "1s",
          background: "radial-gradient(circle, rgba(100,116,139,0.2) 0%, transparent 70%)",
        }}
      ></motion.div>
      <motion.div
        className="absolute bottom-40 left-20 w-16 h-16 rounded-full animate-float opacity-45"
        style={{
          y: yOrbs,
          animationDelay: "2s",
          background: "radial-gradient(circle, rgba(245,158,11,0.3) 0%, transparent 70%)",
        }}
      ></motion.div>

      {/* Main content */}
      <div className="container-custom relative z-10">
        <motion.div style={{ y: yText }} className="text-center max-w-4xl mx-auto">
          {/* Main heading with animation */}
          <motion.h1
            className="text-4xl md:text-6xl font-bold text-navy-900 dark:text-white mb-6 leading-tight"
            data-aos="fade-up"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp(20, 0.5)}
          >
            <span className="block">Discover Amazing</span>
            <span className="block gradient-text">Adventures</span>
            <span className="block">With Us!</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-xl md:text-2xl text-navy-700 dark:text-navy-200 mb-8 leading-relaxed"
            data-aos="fade-up"
            data-aos-delay="200"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp(16, 0.45)}
          >
            Experience the world's most beautiful destinations with our carefully crafted travel
            packages. From spiritual journeys to exotic beaches, we make your dream vacation a
            reality.
          </motion.p>

          {/* Call to action buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            data-aos="fade-up"
            data-aos-delay="400"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            variants={stagger(0.1)}
          >
            <motion.button
              type="button"
              onClick={() => scrollToSection("packages")}
              className="btn btn-primary text-lg px-8 py-4 inline-flex items-center justify-center"
              variants={fadeUp(12)}
            >
              <FaPlane className="mr-2" />
              Plan Your Trip
            </motion.button>
            <motion.button
              type="button"
              onClick={() => scrollToSection("enquiry")}
              className="btn btn-outline text-lg px-8 py-4 inline-flex items-center justify-center"
              variants={fadeUp(12)}
            >
              <FaMapMarkedAlt className="mr-2" />
              Enquiry Now
            </motion.button>
          </motion.div>

          {/* Stats section — glass cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16"
            data-aos="fade-up"
            data-aos-delay="600"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.1 } },
            }}
          >
            <motion.div className="text-center glass-card rounded-2xl p-6" variants={fadeUp(12)}>
              <div className="text-4xl font-bold gradient-text mb-2">500+</div>
              <div className="text-navy-700 dark:text-navy-200 font-medium">Happy Travelers</div>
            </motion.div>
            <motion.div className="text-center glass-card rounded-2xl p-6" variants={fadeUp(12)}>
              <div className="text-4xl font-bold gradient-text mb-2">50+</div>
              <div className="text-navy-700 dark:text-navy-200 font-medium">Destinations</div>
            </motion.div>
            <motion.div className="text-center glass-card rounded-2xl p-6" variants={fadeUp(12)}>
              <div className="text-4xl font-bold gradient-text mb-2">10+</div>
              <div className="text-navy-700 dark:text-navy-200 font-medium">Years Experience</div>
            </motion.div>
          </motion.div>
        </motion.div>
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
            Trusted by 500+ travelers
          </p>
        </div>
      </div>

      <div className="absolute bottom-1/4 left-10 hidden lg:block">
        <div className="glass-card rounded-2xl p-6 animate-float" style={{ animationDelay: "1s" }}>
          <FaPlane className="text-primary-500 text-2xl mb-2" />
          <p className="text-sm text-navy-700 dark:text-navy-200 font-medium">
            50+ destinations worldwide
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
