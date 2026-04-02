import React from "react";
import { FaPlane, FaHotel, FaCar, FaPassport, FaCamera, FaHeadset } from "react-icons/fa";
import useReveal from "../utils/useReveal";

const services = [
  {
    icon: <FaPlane className="text-3xl" />,
    title: "Flight Bookings",
    description: "Best deals on domestic and international flights with major airlines worldwide.",
    features: ["24/7 Booking Support", "Best Price Guarantee", "Flexible Cancellation"],
  },
  {
    icon: <FaHotel className="text-3xl" />,
    title: "Hotel Reservations",
    description: "Luxury to budget accommodations handpicked for your comfort and convenience.",
    features: ["Verified Properties", "Free Cancellation", "Best Rates"],
  },
  {
    icon: <FaCar className="text-3xl" />,
    title: "Transportation",
    description: "Reliable ground transportation including cars, buses, and private transfers.",
    features: ["Professional Drivers", "GPS Tracking", "24/7 Support"],
  },
  {
    icon: <FaPassport className="text-3xl" />,
    title: "Visa Services",
    description: "Complete visa assistance for hassle-free international travel planning.",
    features: ["Document Preparation", "Application Tracking", "Expert Guidance"],
  },
  {
    icon: <FaCamera className="text-3xl" />,
    title: "Tour Packages",
    description: "Curated tour packages with experienced guides and unique experiences.",
    features: ["Local Guides", "Custom Itineraries", "Group Discounts"],
  },
  {
    icon: <FaHeadset className="text-3xl" />,
    title: "24/7 Support",
    description: "Round-the-clock customer support for all your travel needs and emergencies.",
    features: ["Multi-language Support", "Emergency Assistance", "Real-time Updates"],
  },
];

const ServiceCard = ({ service, index }) => {
  const { ref, isVisible } = useReveal(0.1);
  return (
    <div
      ref={ref}
      className={`glass-card rounded-2xl p-8 group reveal ${isVisible ? "reveal--visible" : ""}`}
      style={{ transitionDelay: `${index * 0.08}s` }}
    >
      {/* Icon */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-primary-500 mb-6 group-hover:text-white transition-all duration-300"
        style={{ background: "rgba(245,158,11,0.1)" }}
      >
        <div className="group-hover:scale-110 transition-transform duration-300">
          {service.icon}
        </div>
      </div>

      {/* Content */}
      <h3 className="text-2xl font-bold text-navy-900 dark:text-white mb-4 group-hover:text-primary-500 transition-colors duration-300">
        {service.title}
      </h3>

      <p className="text-navy-700 dark:text-navy-200 mb-6 leading-relaxed">{service.description}</p>

      {/* Features */}
      <ul className="space-y-2">
        {service.features.map((feature, featureIndex) => (
          <li
            key={featureIndex}
            className="flex items-center text-sm text-navy-600 dark:text-navy-300"
          >
            <div className="w-2 h-2 bg-primary-500 rounded-full mr-3"></div>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
};

const Services = () => {
  const header = useReveal(0.2);
  const cta = useReveal(0.2);

  return (
    <section
      id="services"
      className="section-padding relative overflow-hidden scroll-mt-24 md:scroll-mt-28"
    >
      {/* Mesh gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-50/80 to-white/80 dark:from-navy-900 dark:to-navy-800"></div>
      <div className="absolute inset-0 mesh-gradient"></div>
      <div className="container-custom relative z-10">
        {/* Section Header */}
        <div
          ref={header.ref}
          className={`text-center mb-16 reveal ${header.isVisible ? "reveal--visible" : ""}`}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-navy-900 dark:text-white mb-4">
            Our <span className="gradient-text">Services</span>
          </h2>
          <p className="text-xl text-navy-700 dark:text-navy-200 max-w-3xl mx-auto">
            We provide comprehensive travel solutions for all your vacation needs, ensuring a
            seamless and memorable travel experience.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <ServiceCard key={index} service={service} index={index} />
          ))}
        </div>

        {/* Call to Action */}
        <div
          ref={cta.ref}
          className={`text-center mt-16 reveal ${cta.isVisible ? "reveal--visible" : ""}`}
        >
          <div className="glass-card rounded-2xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-navy-900 dark:text-white mb-4">
              Ready to Start Your Journey?
            </h3>
            <p className="text-navy-700 dark:text-navy-200 mb-6">
              Let us help you plan the perfect trip with our comprehensive travel services.
            </p>
            <button
              onClick={() => {
                const el = document.getElementById("enquiry");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="btn btn-primary shadow-glow-primary"
            >
              Get Started Today
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Services;
