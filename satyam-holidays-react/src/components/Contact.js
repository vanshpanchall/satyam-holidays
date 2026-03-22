import React from "react";
import {
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaClock,
  FaFacebook,
  FaInstagram,
  FaTwitter,
  FaWhatsapp,
} from "react-icons/fa";
import siteConfig, { toWhatsAppLink } from "../config/siteConfig";
import { motion } from "framer-motion";
import { fadeUp, fadeLeft, fadeRight } from "../utils/motion";

const Contact = () => {
  const socialLinks = [
    {
      name: "Facebook",
      icon: <FaFacebook className="text-xl" />,
      url: siteConfig.social.facebook,
      color: "hover:bg-blue-600",
    },
    {
      name: "Instagram",
      icon: <FaInstagram className="text-xl" />,
      url: siteConfig.social.instagram,
      color: "hover:bg-pink-600",
    },
    {
      name: "Twitter",
      icon: <FaTwitter className="text-xl" />,
      url: siteConfig.social.twitter,
      color: "hover:bg-blue-400",
    },
    {
      name: "WhatsApp",
      icon: <FaWhatsapp className="text-xl" />,
      url: toWhatsAppLink(siteConfig.company.whatsapp),
      color: "hover:bg-green-500",
    },
  ];

  return (
    <section
      id="contact"
      className="section-padding relative overflow-hidden text-white scroll-mt-24 md:scroll-mt-28"
    >
      {/* Dark glass background */}
      <div className="absolute inset-0 bg-navy-900"></div>
      <div className="absolute inset-0 mesh-gradient"></div>
      <div className="container-custom relative z-10">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          data-aos="fade-up"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp(14, 0.45)}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Get in <span className="gradient-text">Touch</span>
          </h2>
          <p className="text-xl text-navy-200 max-w-3xl mx-auto">
            Ready to start your journey? Contact us today and let our travel experts help you plan
            the perfect vacation.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <motion.div
            data-aos="fade-right"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeRight(16, 0.45)}
          >
            <div className="glass-dark rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-8">Contact Information</h3>

              <div className="space-y-6">
                {/* Address */}
                <div className="flex items-start space-x-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)" }}
                  >
                    <FaMapMarkerAlt className="text-xl" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Our Office</h4>
                    <p className="text-navy-200 leading-relaxed">
                      {siteConfig.company.address.line1}
                      <br />
                      {siteConfig.company.address.line2}
                      <br />
                      {siteConfig.company.address.country}
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start space-x-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)" }}
                  >
                    <FaPhone className="text-xl" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Call Us</h4>
                    <div className="text-navy-200">
                      {siteConfig.company.phones.map((p) => (
                        <div key={p}>
                          <a
                            href={`tel:${p.replace(/\s/g, "")}`}
                            className="hover:text-primary-400 transition-colors"
                          >
                            {p}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start space-x-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)" }}
                  >
                    <FaEnvelope className="text-xl" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Email Us</h4>
                    <div className="text-navy-200">
                      <a
                        href={`mailto:${siteConfig.company.email}`}
                        className="hover:text-primary-400 transition-colors"
                      >
                        {siteConfig.company.email}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Business Hours */}
                <div className="flex items-start space-x-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)" }}
                  >
                    <FaClock className="text-xl" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Business Hours</h4>
                    <p className="text-navy-200">
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
          </motion.div>

          {/* Map and Social Links */}
          <motion.div
            data-aos="fade-left"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeLeft(16, 0.45)}
          >
            {/* Map Placeholder */}
            <div className="glass-dark rounded-2xl p-8 mb-8">
              <h3 className="text-2xl font-bold mb-6">Find Us</h3>
              <div className="bg-navy-800 rounded-xl h-64 flex items-center justify-center">
                <div className="text-center">
                  <FaMapMarkerAlt className="text-4xl text-primary-400 mx-auto mb-4" />
                  <p className="text-navy-200">Interactive Map Coming Soon</p>
                  <p className="text-sm text-navy-300 mt-2">
                    {siteConfig.company.address.line1}, {siteConfig.company.address.line2}
                  </p>
                </div>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="glass-dark rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-6">Follow Us</h3>
              <p className="text-navy-200 mb-6">
                Stay updated with our latest offers, travel tips, and destination guides.
              </p>

              <div className="flex flex-wrap gap-4">
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group relative w-12 h-12 rounded-full border border-white/20 bg-white/5 backdrop-blur-md flex items-center justify-center transition-all duration-300 hover:bg-white/10 hover:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${social.color}`}
                    aria-label={social.name}
                  >
                    <span className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    <span className="text-white group-hover:scale-110 transition-transform">
                      {social.icon}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Quick Contact Cards */}
        <motion.div
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8"
          data-aos="fade-up"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={{ hidden: { opacity: 1 }, show: { opacity: 1 } }}
        >
          <div className="glass-dark rounded-2xl p-6 text-center hover:shadow-glass-lg transition-all duration-300 group">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)" }}
            >
              <FaPhone className="text-2xl text-white" />
            </div>
            <h4 className="text-xl font-bold mb-2">Call Now</h4>
            <p className="text-navy-200 mb-4">Get instant assistance</p>
            <a
              href={`tel:${siteConfig.company.emergencyPhone.replace(/\s/g, "")}`}
              className="btn btn-primary w-full shadow-glow-primary"
            >
              {siteConfig.company.emergencyPhone}
            </a>
          </div>

          <div className="glass-dark rounded-2xl p-6 text-center hover:shadow-glass-lg transition-all duration-300 group">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)" }}
            >
              <FaWhatsapp className="text-2xl text-white" />
            </div>
            <h4 className="text-xl font-bold mb-2">WhatsApp</h4>
            <p className="text-navy-200 mb-4">Quick chat support</p>
            <a
              href={toWhatsAppLink(siteConfig.company.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary w-full shadow-glow-primary"
            >
              Chat on WhatsApp
            </a>
          </div>

          <div className="glass-dark rounded-2xl p-6 text-center hover:shadow-glass-lg transition-all duration-300 group">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)" }}
            >
              <FaEnvelope className="text-2xl text-white" />
            </div>
            <h4 className="text-xl font-bold mb-2">Email Us</h4>
            <p className="text-navy-200 mb-4">Send us a message</p>
            <a
              href={`mailto:${siteConfig.company.email}`}
              className="btn btn-primary w-full shadow-glow-primary"
            >
              Send Email
            </a>
          </div>
        </motion.div>

        {/* Emergency Contact */}
        <motion.div
          className="mt-16 text-center"
          data-aos="fade-up"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp(16, 0.45)}
        >
          <div
            className="glass-dark rounded-2xl p-8 max-w-2xl mx-auto"
            style={{
              background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(234,88,12,0.15))",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <h3 className="text-2xl font-bold text-white mb-4">24/7 Emergency Support</h3>
            <p className="text-white/90 mb-6">
              Need immediate assistance while traveling? Our emergency support team is available
              round the clock.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={`tel:${siteConfig.company.emergencyPhone.replace(/\s/g, "")}`}
                className="btn bg-white text-primary-600 hover:bg-gray-100"
              >
                Emergency: {siteConfig.company.emergencyPhone}
              </a>
              <a
                href={`mailto:${siteConfig.company.emergencyEmail}`}
                className="btn bg-white text-primary-600 hover:bg-gray-100"
              >
                Emergency Email
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Contact;
