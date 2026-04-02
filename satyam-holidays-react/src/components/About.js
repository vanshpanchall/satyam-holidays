import React from "react";
import { FaAward, FaUsers, FaGlobe, FaHeart } from "react-icons/fa";
import useReveal from "../utils/useReveal";

const values = [
  {
    icon: <FaAward className="text-3xl" />,
    title: "Excellence",
    description: "We strive for excellence in every aspect of our service delivery.",
  },
  {
    icon: <FaUsers className="text-3xl" />,
    title: "Customer First",
    description: "Our customers' satisfaction and happiness are our top priorities.",
  },
  {
    icon: <FaGlobe className="text-3xl" />,
    title: "Global Reach",
    description: "Connecting travelers to destinations across the globe with local expertise.",
  },
  {
    icon: <FaHeart className="text-3xl" />,
    title: "Passion",
    description: "We are passionate about creating unforgettable travel experiences.",
  },
];

const ValueCard = ({ value, index }) => {
  const { ref, isVisible } = useReveal(0.1);
  return (
    <div
      ref={ref}
      className={`text-center p-6 rounded-2xl glass-card group reveal-scale ${isVisible ? "reveal-scale--visible" : ""}`}
      style={{ transitionDelay: `${index * 0.1}s` }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-primary-500 mx-auto mb-4 group-hover:text-white transition-all duration-300"
        style={{ background: "rgba(245,158,11,0.1)" }}
      >
        <div className="group-hover:scale-110 transition-transform duration-300">{value.icon}</div>
      </div>
      <h4 className="text-xl font-bold text-navy-900 dark:text-white mb-3">{value.title}</h4>
      <p className="text-navy-700 dark:text-navy-200">{value.description}</p>
    </div>
  );
};

const About = () => {
  const content = useReveal(0.1);
  const visual = useReveal(0.1);
  const valuesHeader = useReveal(0.2);
  const mission = useReveal(0.15);

  return (
    <section
      id="about"
      className="section-padding relative overflow-hidden scroll-mt-24 md:scroll-mt-28"
    >
      <div className="absolute inset-0 bg-white/60 dark:bg-navy-900/80"></div>
      <div className="absolute inset-0 mesh-gradient"></div>
      <div className="container-custom relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div
            ref={content.ref}
            className={`reveal-left ${content.isVisible ? "reveal-left--visible" : ""}`}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-navy-900 dark:text-white mb-6">
              About <span className="gradient-text">Satyam Holidays</span>
            </h2>

            <p className="text-lg text-navy-700 dark:text-navy-200 mb-6 leading-relaxed">
              Founded with a vision to make travel accessible, enjoyable, and memorable, Satyam
              Holidays has been serving travelers for over a decade. We believe that every journey
              should be an adventure filled with joy, discovery, and unforgettable moments.
            </p>

            <p className="text-lg text-navy-700 dark:text-navy-200 mb-8 leading-relaxed">
              Our team of experienced travel experts works tirelessly to curate the perfect travel
              experiences, from spiritual pilgrimages to exotic beach getaways, ensuring that every
              trip exceeds your expectations.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="text-center p-4 glass-card rounded-xl">
                <div className="text-3xl font-bold gradient-text mb-1">35+</div>
                <div className="text-sm text-navy-700 dark:text-navy-200 font-medium">
                  Years Experience
                </div>
              </div>
              <div className="text-center p-4 glass-card rounded-xl">
                <div className="text-3xl font-bold gradient-text mb-1">15000+</div>
                <div className="text-sm text-navy-700 dark:text-navy-200 font-medium">
                  Happy Customers
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                const el = document.getElementById("contact");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="btn btn-primary shadow-glow-primary"
            >
              Learn More About Us
            </button>
          </div>

          {/* Right Column - Visual */}
          <div
            ref={visual.ref}
            className={`relative reveal-right ${visual.isVisible ? "reveal-right--visible" : ""}`}
          >
            <div className="relative z-10">
              <div
                className="glass-card rounded-3xl p-8 text-white"
                style={{
                  background: "linear-gradient(135deg, rgba(245,158,11,0.85), rgba(234,88,12,0.9))",
                  backdropFilter: "blur(20px)",
                }}
              >
                <h3 className="text-2xl font-bold mb-4">Why Choose Us?</h3>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                    Personalized travel planning
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                    24/7 customer support
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                    Best price guarantees
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                    Experienced travel experts
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                    Safe and secure bookings
                  </li>
                </ul>
              </div>
            </div>

            {/* Floating orbs */}
            <div
              className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-40 animate-float"
              style={{
                background: "radial-gradient(circle, rgba(100,116,139,0.25) 0%, transparent 70%)",
              }}
            ></div>
            <div
              className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full opacity-50 animate-float"
              style={{
                animationDelay: "1s",
                background: "radial-gradient(circle, rgba(245,158,11,0.3) 0%, transparent 70%)",
              }}
            ></div>
          </div>
        </div>

        {/* Values Section */}
        <div className="mt-20">
          <div
            ref={valuesHeader.ref}
            className={`text-center mb-12 reveal ${valuesHeader.isVisible ? "reveal--visible" : ""}`}
          >
            <h3 className="text-3xl font-bold text-navy-900 dark:text-white mb-4">Our Values</h3>
            <p className="text-lg text-navy-700 dark:text-navy-200 max-w-2xl mx-auto">
              These core values guide everything we do and help us deliver exceptional travel
              experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <ValueCard key={index} value={value} index={index} />
            ))}
          </div>
        </div>

        {/* Mission Statement */}
        <div
          ref={mission.ref}
          className={`mt-20 glass-card rounded-3xl p-8 md:p-12 reveal-scale ${mission.isVisible ? "reveal-scale--visible" : ""}`}
        >
          <div className="text-center max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold text-navy-900 dark:text-white mb-6">Our Mission</h3>
            <p className="text-xl text-navy-700 dark:text-navy-200 leading-relaxed">
              &ldquo;To inspire and enable people to explore the world by providing exceptional
              travel experiences that create lasting memories and foster a deeper understanding of
              diverse cultures and destinations.&rdquo;
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
