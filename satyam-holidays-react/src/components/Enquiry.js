import { useState, useRef, lazy, Suspense } from "react";
import { useToast } from "./ToastProvider";
import { useForm } from "react-hook-form";
import { FaPaperPlane, FaCheck, FaExclamationTriangle } from "react-icons/fa";
import { apiUrl } from "../config/siteConfig";
import { csrfFetch, refreshCsrfToken } from "../utils/csrf";
import { useSiteConfig } from "../contexts/SettingsContext";
import useReveal from "../utils/useReveal";

const ReCAPTCHA = lazy(() => import("react-google-recaptcha"));
const HCaptcha = lazy(() => import("@hcaptcha/react-hcaptcha"));

const Enquiry = ({ sectionId = "enquiry" }) => {
  const siteConfig = useSiteConfig();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [submitStatus, setSubmitStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const PROVIDER = (process.env.REACT_APP_CAPTCHA_PROVIDER || "recaptcha_v2").toLowerCase();
  const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || "";
  const HCAPTCHA_SITE_KEY = process.env.REACT_APP_HCAPTCHA_SITE_KEY || "";
  const useCaptcha =
    (PROVIDER.startsWith("hcaptcha") && HCAPTCHA_SITE_KEY) ||
    (PROVIDER.startsWith("recaptcha") && RECAPTCHA_SITE_KEY);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const { show } = useToast();
  const recaptchaRef = useRef(null);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setSubmitStatus(null);
    setErrorMsg("");

    try {
      // For reCAPTCHA v3, execute invisible challenge to retrieve token at submit time
      let currentToken = captchaToken;
      if (PROVIDER === "recaptcha_v3" && RECAPTCHA_SITE_KEY && recaptchaRef.current) {
        try {
          const v3Token = await recaptchaRef.current.executeAsync();
          currentToken = v3Token || "";
          setCaptchaToken(currentToken);
        } catch (_) {
          // ignore; backend will reject if missing when enforced
        }
      }
      // Send enquiry to backend
      // Clean payload: drop empty optional fields so Joi doesn't see empty strings
      const payload = Object.fromEntries(
        Object.entries({
          name: data.name,
          email: data.email,
          phone: data.phone,
          destination: data.destination || undefined,
          travelDate: data.travelDate || undefined,
          travelers: data.travelers || undefined,
          budget: data.budget || undefined,
          message: data.message || undefined,
          // Send generic key understood by backend
          captchaToken: currentToken || undefined,
        }).filter(([, v]) => v !== undefined && v !== null && v !== "")
      );

      // Ensure CSRF cookie exists before sending state-changing request
      const apiBase = apiUrl("").replace(/\/$/, "");
      await refreshCsrfToken(apiBase);

      const response = await csrfFetch(apiUrl("/api/enquiries"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const resJson = await response.json().catch(() => null);
      if (response.ok && resJson && resJson.success) {
        setSubmitStatus("success");
        reset();
        setCaptchaToken("");
        show("Enquiry submitted successfully! We will contact you soon.", { type: "success" });
      } else {
        setSubmitStatus("error");
        const msg =
          (resJson && (resJson.message || (resJson.errors && resJson.errors.join(", ")))) ||
          "Request failed";
        setErrorMsg(msg);
        show(`Failed to submit enquiry: ${msg}`, { type: "error" });
      }
    } catch {
      setSubmitStatus("error");
      show("Unexpected error occurred while submitting enquiry.", { type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const headerReveal = useReveal(0.2);
  const infoReveal = useReveal(0.1);
  const formReveal = useReveal(0.1);

  return (
    <section
      id={sectionId || undefined}
      className="section-padding relative overflow-hidden scroll-mt-24 md:scroll-mt-28"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50/80 to-navy-50/80 dark:from-navy-900 dark:to-navy-800"></div>
      <div className="absolute inset-0 mesh-gradient"></div>
      <div className="container-custom relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div
            ref={headerReveal.ref}
            className={`text-center mb-16 reveal ${headerReveal.isVisible ? "reveal--visible" : ""}`}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-navy-900 dark:text-white mb-4">
              Send Us Your <span className="gradient-text">Enquiry</span>
            </h2>
            <p className="text-xl text-navy-700 dark:text-navy-200 max-w-3xl mx-auto">
              Ready to start your journey? Fill out the form below and our travel experts will get
              back to you with the best packages and deals.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Contact Information */}
            <div
              ref={infoReveal.ref}
              className={`reveal-left ${infoReveal.isVisible ? "reveal-left--visible" : ""}`}
            >
              <div className="glass-card rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-navy-900 dark:text-white mb-6">
                  Get in Touch
                </h3>
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-500">
                      <FaPaperPlane className="text-xl" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-navy-900 dark:text-white mb-1">Email Us</h4>
                      <p className="text-navy-700 dark:text-navy-200">{siteConfig.company.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-500">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-navy-900 dark:text-white mb-1">Call Us</h4>
                      <p className="text-navy-700 dark:text-navy-200">
                        {siteConfig.company.phones[0]}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-500">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-navy-900 dark:text-white mb-1">Visit Us</h4>
                      <p className="text-navy-700 dark:text-navy-200">
                        {siteConfig.company.address.line1}
                        <br />
                        {siteConfig.company.address.line2}
                        <br />
                        {siteConfig.company.address.country}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="mt-8 p-6 rounded-xl"
                  style={{
                    background: "rgba(245,158,11,0.06)",
                    border: "1px solid rgba(245,158,11,0.12)",
                  }}
                >
                  <h4 className="font-semibold text-navy-900 dark:text-white mb-3">
                    Why Choose Us?
                  </h4>
                  <ul className="space-y-2 text-sm text-navy-700 dark:text-navy-200">
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-primary-500 rounded-full mr-3"></div>
                      Best price guarantees
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-primary-500 rounded-full mr-3"></div>
                      24/7 customer support
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-primary-500 rounded-full mr-3"></div>
                      Customized packages
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-primary-500 rounded-full mr-3"></div>
                      Visa assistance
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Enquiry Form */}
            <div
              ref={formReveal.ref}
              className={`reveal-right ${formReveal.isVisible ? "reveal-right--visible" : ""}`}
            >
              <div className="glass-card rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-navy-900 dark:text-white mb-6">
                  Send Enquiry
                </h3>

                {/* Success/Error Messages */}
                {submitStatus === "success" && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                    <FaCheck className="text-green-500 mr-3" />
                    <span className="text-green-700">
                      Thank you! Your enquiry has been sent successfully. We&apos;ll get back to you
                      soon.
                    </span>
                  </div>
                )}

                {submitStatus === "error" && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                    <FaExclamationTriangle className="text-red-500 mr-3" />
                    <span className="text-red-700">
                      Sorry! There was an error sending your enquiry. {errorMsg}
                    </span>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-navy-700 dark:text-navy-200 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      {...register("name", {
                        required: "Full name is required",
                      })}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                        errors.name ? "border-red-300" : "border-navy-200 dark:border-navy-600"
                      }`}
                      placeholder="Enter your full name"
                      aria-invalid={!!errors.name}
                      aria-describedby={errors.name ? "name-error" : undefined}
                    />
                    {errors.name && (
                      <p id="name-error" className="mt-1 text-sm text-red-600">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-navy-700 dark:text-navy-200 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      {...register("email", {
                        required: "Email is required",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Invalid email address",
                        },
                      })}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                        errors.email ? "border-red-300" : "border-navy-200 dark:border-navy-600"
                      }`}
                      placeholder="Enter your email address"
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? "email-error" : undefined}
                    />
                    {errors.email && (
                      <p id="email-error" className="mt-1 text-sm text-red-600">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-navy-700 dark:text-navy-200 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      {...register("phone", {
                        required: "Phone number is required",
                        pattern: {
                          value: /^[0-9+\-\s()]*$/,
                          message: "Invalid phone number",
                        },
                      })}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                        errors.phone ? "border-red-300" : "border-navy-200 dark:border-navy-600"
                      }`}
                      placeholder="Enter your phone number"
                      aria-invalid={!!errors.phone}
                      aria-describedby={errors.phone ? "phone-error" : undefined}
                    />
                    {errors.phone && (
                      <p id="phone-error" className="mt-1 text-sm text-red-600">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>

                  {/* Destination */}
                  <div>
                    <label className="block text-sm font-medium text-navy-700 dark:text-navy-200 mb-2">
                      Preferred Destination
                    </label>
                    <select
                      {...register("destination")}
                      className="w-full px-4 py-3 border border-navy-200 dark:border-navy-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                    >
                      <option value="">Select destination</option>
                      <option value="domestic">Domestic Packages</option>
                      <option value="international">International Packages</option>
                      <option value="chardham">Chardham Yatra</option>
                      <option value="kashmir">Jammu & Kashmir</option>
                      <option value="andaman">Andaman & Nicobar</option>
                      <option value="dubai">Dubai</option>
                      <option value="singapore">Singapore</option>
                      <option value="thailand">Thailand</option>
                      <option value="vietnam">Vietnam</option>
                      <option value="nepal">Nepal</option>
                      <option value="custom">Custom Package</option>
                    </select>
                  </div>

                  {/* Travel Date */}
                  <div>
                    <label className="block text-sm font-medium text-navy-700 dark:text-navy-200 mb-2">
                      Preferred Travel Date
                    </label>
                    <input
                      type="date"
                      {...register("travelDate")}
                      className="w-full px-4 py-3 border border-navy-200 dark:border-navy-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                    />
                  </div>

                  {/* Number of Travelers */}
                  <div>
                    <label className="block text-sm font-medium text-navy-700 dark:text-navy-200 mb-2">
                      Number of Travelers
                    </label>
                    <select
                      {...register("travelers")}
                      className="w-full px-4 py-3 border border-navy-200 dark:border-navy-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                    >
                      <option value="">Select number</option>
                      <option value="1">1 Person</option>
                      <option value="2">2 People</option>
                      <option value="3">3 People</option>
                      <option value="4">4 People</option>
                      <option value="5+">5+ People</option>
                    </select>
                  </div>

                  {/* Budget */}
                  <div>
                    <label className="block text-sm font-medium text-navy-700 dark:text-navy-200 mb-2">
                      Budget Range
                    </label>
                    <select
                      {...register("budget")}
                      className="w-full px-4 py-3 border border-navy-200 dark:border-navy-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                    >
                      <option value="">Select budget</option>
                      <option value="under-20k">Under ₹20,000</option>
                      <option value="20k-50k">₹20,000 - ₹50,000</option>
                      <option value="50k-1l">₹50,000 - ₹1,00,000</option>
                      <option value="above-1l">Above ₹1,00,000</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-navy-700 dark:text-navy-200 mb-2">
                      Additional Requirements
                    </label>
                    <textarea
                      {...register("message")}
                      rows="4"
                      className="w-full px-4 py-3 border border-navy-200 dark:border-navy-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors resize-none"
                      placeholder="Tell us about your travel preferences, special requirements, or any questions you have..."
                    ></textarea>
                  </div>

                  {/* CAPTCHA */}
                  {useCaptcha ? (
                    <Suspense
                      fallback={
                        <p className="text-sm text-navy-600 dark:text-navy-300">
                          Loading CAPTCHA...
                        </p>
                      }
                    >
                      {PROVIDER === "hcaptcha" ? (
                        <div>
                          <HCaptcha
                            sitekey={HCAPTCHA_SITE_KEY}
                            onVerify={(val) => setCaptchaToken(val || "")}
                            onExpire={() => setCaptchaToken("")}
                          />
                        </div>
                      ) : PROVIDER === "recaptcha_v3" ? (
                        <div>
                          <ReCAPTCHA
                            ref={recaptchaRef}
                            sitekey={RECAPTCHA_SITE_KEY}
                            size="invisible"
                            onChange={(val) => setCaptchaToken(val || "")}
                          />
                          <p className="text-xs text-navy-500 dark:text-navy-400">
                            Protected by reCAPTCHA v3
                          </p>
                        </div>
                      ) : (
                        <div>
                          <ReCAPTCHA
                            sitekey={RECAPTCHA_SITE_KEY}
                            onChange={(val) => setCaptchaToken(val || "")}
                            onExpired={() => setCaptchaToken("")}
                          />
                        </div>
                      )}
                    </Suspense>
                  ) : null}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={
                      isSubmitting || (PROVIDER !== "recaptcha_v3" && !!useCaptcha && !captchaToken)
                    }
                    className="w-full btn btn-primary py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-primary"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <div className="loading-spinner mr-3"></div>
                        Sending Enquiry...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <FaPaperPlane className="mr-2" />
                        Send Enquiry
                      </div>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
export default Enquiry;
