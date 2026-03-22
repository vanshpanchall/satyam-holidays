import React from "react";
import { FaFacebook, FaInstagram, FaTwitter, FaWhatsapp, FaArrowUp } from "react-icons/fa";
import siteConfig, { toWhatsAppLink } from "../config/siteConfig";

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden text-white">
      <div
        className="absolute inset-0 bg-navy-950"
        style={{ background: "linear-gradient(180deg, #0f172a 0%, #020617 100%)" }}
      ></div>
      <div className="absolute inset-0 mesh-gradient"></div>
      <div className="container-custom relative z-10">
        {/* Main Footer Content */}
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="lg:col-span-1">
              <div className="flex items-center space-x-3 mb-6">
                <img
                  src={siteConfig.company.logo}
                  alt={`${siteConfig.company.name} logo`}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-lg object-contain"
                  loading="lazy"
                  decoding="async"
                />
                <div>
                  <h3 className="text-xl font-bold">{siteConfig.company.name}</h3>
                  <p className="text-sm text-primary-400">{siteConfig.company.tagline}</p>
                </div>
              </div>
              <p className="text-navy-200 mb-6 leading-relaxed">
                Your trusted travel partner for unforgettable journeys. We specialize in creating
                personalized travel experiences that exceed expectations.
              </p>
              <div className="flex space-x-3">
                <a
                  href={siteConfig.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative w-10 h-10 rounded-full border border-white/20 bg-white/5 backdrop-blur-md flex items-center justify-center transition-all duration-300 hover:bg-white/10 hover:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                  aria-label="Facebook"
                >
                  <span className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <FaFacebook className="text-lg text-white group-hover:scale-110 transition-transform" />
                </a>
                <a
                  href={siteConfig.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative w-10 h-10 rounded-full border border-white/20 bg-white/5 backdrop-blur-md flex items-center justify-center transition-all duration-300 hover:bg-white/10 hover:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                  aria-label="Instagram"
                >
                  <span className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <FaInstagram className="text-lg text-white group-hover:scale-110 transition-transform" />
                </a>
                <a
                  href={siteConfig.social.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative w-10 h-10 rounded-full border border-white/20 bg-white/5 backdrop-blur-md flex items-center justify-center transition-all duration-300 hover:bg-white/10 hover:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                  aria-label="Twitter"
                >
                  <span className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <FaTwitter className="text-lg text-white group-hover:scale-110 transition-transform" />
                </a>
                <a
                  href={toWhatsAppLink(siteConfig.company.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative w-10 h-10 rounded-full border border-white/20 bg-white/5 backdrop-blur-md flex items-center justify-center transition-all duration-300 hover:bg-white/10 hover:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                  aria-label="WhatsApp"
                >
                  <span className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <FaWhatsapp className="text-lg text-white group-hover:scale-110 transition-transform" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-bold mb-6">Quick Links</h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#home"
                    className="text-navy-200 hover:text-primary-400 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById("home").scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Home
                  </a>
                </li>
                <li>
                  <a
                    href="#about"
                    className="text-navy-200 hover:text-primary-400 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById("about").scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="#services"
                    className="text-navy-200 hover:text-primary-400 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById("services").scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Services
                  </a>
                </li>
                <li>
                  <a
                    href="#packages"
                    className="text-navy-200 hover:text-primary-400 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById("packages").scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Packages
                  </a>
                </li>
                <li>
                  <a
                    href="#contact"
                    className="text-navy-200 hover:text-primary-400 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById("contact").scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>

            {/* Destinations */}
            <div>
              <h4 className="text-lg font-bold mb-6">Destinations</h4>
              <ul className="space-y-3">
                {[
                  { label: "Domestic Packages", id: "packages" },
                  { label: "International Packages", id: "packages" },
                  { label: "Chardham Yatra", id: "packages" },
                  { label: "Kashmir Tours", id: "packages" },
                  { label: "Dubai Packages", id: "packages" },
                  { label: "Singapore Tours", id: "packages" },
                ].map((item) => (
                  <li key={item.label}>
                    <button
                      type="button"
                      className="text-navy-200 hover:text-primary-400 transition-colors"
                      onClick={() => {
                        const el = document.getElementById(item.id);
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="text-lg font-bold mb-6">Contact Info</h4>
              <div className="space-y-4">
                <div>
                  <p className="text-navy-200 text-sm">Address:</p>
                  <p className="text-white">
                    {siteConfig.company.address.line1}
                    <br />
                    {siteConfig.company.address.line2}
                  </p>
                </div>
                <div>
                  <p className="text-navy-200 text-sm">Phone:</p>
                  {siteConfig.company.phones.map((p) => (
                    <div key={p}>
                      <a
                        href={`tel:${p.replace(/\s/g, "")}`}
                        className="text-white hover:text-primary-400 transition-colors"
                      >
                        {p}
                      </a>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-navy-200 text-sm">Email:</p>
                  <a
                    href={`mailto:${siteConfig.company.email}`}
                    className="text-white hover:text-primary-400 transition-colors"
                  >
                    {siteConfig.company.email}
                  </a>
                </div>
                <div>
                  <p className="text-navy-200 text-sm">Business Hours:</p>
                  <p className="text-white text-sm">
                    {siteConfig.company.hours.weekdays}
                    <br />
                    {siteConfig.company.hours.saturday}
                    <br />
                    {siteConfig.company.hours.sunday}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-white/10 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
              <p className="text-navy-200">
                © {currentYear} {siteConfig.company.name}. All rights reserved.
              </p>
            </div>

            <div className="flex items-center space-x-6 text-sm">
              {["Privacy Policy", "Terms of Service", "Refund Policy"].map((label) => (
                <button
                  key={label}
                  type="button"
                  className="text-navy-200 hover:text-primary-400 transition-colors"
                  onClick={() => {
                    const section = document.getElementById("contact");
                    if (section) section.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Scroll to Top Button */}
            <button
              onClick={scrollToTop}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-glow-primary hover:shadow-glow-primary-lg"
              style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)" }}
              aria-label="Scroll to top"
            >
              <FaArrowUp className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
