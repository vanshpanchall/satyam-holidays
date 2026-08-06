import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaLock, FaEnvelope, FaEye, FaEyeSlash, FaArrowLeft, FaShieldAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { apiUrl, safeJson, toastApiError } from "../../config/siteConfig";
import { useSiteConfig } from "../../contexts/SettingsContext";
import { markAdminAuthenticated } from "./adminAuthCache";

const AdminLogin = () => {
  const siteConfig = useSiteConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMfa, setShowMfa] = useState(false);
  const [mfaToken, setMfaToken] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const json = await safeJson(res);
      if (res.ok && json.success) {
        if (json.mfaRequired) {
          setMfaToken(json.mfaToken);
          setShowMfa(true);
          toast.info("Verification code dispatched to your email address.");
        } else {
          if (json.token) {
            localStorage.setItem("adminToken", json.token);
          }
          markAdminAuthenticated();
          toast.success("Welcome back, Administrator!");
          navigate("/admin");
        }
      } else {
        toastApiError(json, "Invalid credentials provided");
      }
    } catch (err) {
      toastApiError(err, "Unable to establish connection to server");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e) => {
    e.preventDefault();
    if (mfaCode.length < 6) {
      toastApiError("Please enter a valid 6-digit verification code");
      return;
    }
    setVerifying(true);

    try {
      const res = await fetch(apiUrl("/api/auth/verify-mfa"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mfaToken, code: mfaCode }),
        credentials: "include",
      });

      const json = await safeJson(res);
      if (res.ok && json.success) {
        if (json.token) {
          localStorage.setItem("adminToken", json.token);
        }
        markAdminAuthenticated();
        toast.success("MFA verified. Welcome back!");
        navigate("/admin");
      } else {
        toastApiError(json, "Invalid or expired verification code");
      }
    } catch (err) {
      toastApiError(err, "Unable to establish connection to server");
    } finally {
      setVerifying(false);
    }
  };

  /* ── Shared input className ── */
  const inputBase =
    "w-full pl-10 pr-4 py-3.5 rounded-2xl border text-sm transition-all duration-200 " +
    "border-amber-200/60 bg-white/80 text-slate-800 placeholder-slate-400 " +
    "focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15 focus:bg-white " +
    "hover:border-amber-300/80";

  return (
    <div className="min-h-screen flex font-sans overflow-hidden">
      {/* ─── Left Panel — Logo Video as Brand Showcase ─── */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between overflow-hidden bg-slate-950">
        {/* Video Background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        >
          <source src="/logo.mp4" type="video/mp4" />
        </video>

        {/* Dark Overlays for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/30" />
        <div className="absolute inset-0 bg-slate-950/20" />

        {/* Top — Back Link */}
        <div className="relative z-10 p-8 lg:p-10">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs font-medium group"
          >
            <FaArrowLeft className="text-[10px] group-hover:-translate-x-1 transition-transform" />
            Back to Website
          </a>
        </div>

        {/* Bottom — Company Branding */}
        <div className="relative z-10 p-8 lg:p-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center overflow-hidden p-1">
                <img
                  src={siteConfig.company.logo}
                  alt={siteConfig.company.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">
                  {siteConfig.company.name}
                </p>
                <p className="text-white/40 text-xs mt-0.5">{siteConfig.company.tagline}</p>
              </div>
            </div>
            <p className="text-white/30 text-xs max-w-sm leading-relaxed">
              Internal administration portal. Authorized personnel only.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ─── Right Panel — Professional Admin Login ─── */}
      <div
        className="w-full lg:w-[45%] flex flex-col justify-center items-center relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #fffbf0 0%, #fff7ed 25%, #ffffff 55%, #fef3e2 100%)",
        }}
      >
        {/* ── Decorative Floating Orbs ── */}
        <motion.div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(234,88,12,0.08) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
        <motion.div
          className="absolute top-1/3 -right-10 w-44 h-44 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)",
          }}
          animate={{ y: [0, -20, 0], opacity: [0.4, 0.8, 0.4] }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />

        {/* ── Subtle dot pattern overlay ── */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: "radial-gradient(circle, #f59e0b 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Mobile — Back Link */}
        <div className="absolute top-5 left-5 lg:hidden z-10">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-amber-700/60 hover:text-amber-800 text-xs font-semibold transition-colors"
          >
            <FaArrowLeft className="text-[10px]" /> Back
          </a>
        </div>

        {/* ── Form Container ── */}
        <div className="w-full max-w-[400px] px-6 sm:px-8 relative z-10">
          {/* Logo & Heading */}
          <div className="mb-10">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 180, damping: 14 }}
              className="mb-6"
            >
              <img
                src={siteConfig.company.logo}
                alt={`${siteConfig.company.name} logo`}
                className="w-40 h-40 object-contain mx-auto"
              />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-[28px] font-extrabold tracking-tight text-slate-800 mb-2"
            >
              Welcome back
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-slate-400 text-sm leading-relaxed"
            >
              Sign in to manage packages, bookings & enquiries
            </motion.p>
          </div>

          {/* ── Glassmorphic Form Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="rounded-3xl p-6 sm:p-7"
            style={{
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(245,158,11,0.12)",
              boxShadow: "0 8px 40px rgba(245,158,11,0.06), 0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <AnimatePresence mode="wait">
              {!showMfa ? (
                <motion.form
                  key="login-form"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleLogin}
                  className="space-y-5"
                >
                  {/* Email */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-600 tracking-wide uppercase">
                      Email Address
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-amber-400/60 group-focus-within:text-amber-500 transition-colors">
                        <FaEnvelope className="text-sm" />
                      </div>
                      <input
                        id="admin-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputBase}
                        placeholder="admin@satyamholidays.com"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-600 tracking-wide uppercase">
                      Password
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-amber-400/60 group-focus-within:text-amber-500 transition-colors">
                        <FaLock className="text-sm" />
                      </div>
                      <input
                        id="admin-password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputBase + " !pr-11"}
                        placeholder="••••••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-amber-400/50 hover:text-amber-600 transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <FaEyeSlash className="text-sm" />
                        ) : (
                          <FaEye className="text-sm" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <motion.button
                    id="admin-login-submit"
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.015, y: loading ? 0 : -1 }}
                    whileTap={{ scale: loading ? 1 : 0.975 }}
                    className="w-full py-3.5 rounded-2xl font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 text-sm mt-3 transition-all duration-200"
                    style={{
                      background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #dc2626 100%)",
                      backgroundSize: "200% 200%",
                      boxShadow: "0 6px 24px rgba(245,158,11,0.25), 0 2px 8px rgba(234,88,12,0.15)",
                    }}
                  >
                    <span className="flex items-center justify-center gap-2.5">
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Authenticating...</span>
                        </>
                      ) : (
                        <>
                          <FaLock className="text-xs opacity-80" />
                          <span>Sign In Securely</span>
                        </>
                      )}
                    </span>
                  </motion.button>
                </motion.form>
              ) : (
                <motion.form
                  key="mfa-form"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleMfaVerify}
                  className="space-y-5"
                >
                  {/* MFA Icon */}
                  <div className="flex justify-center mb-2">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 12 }}
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
                        border: "1.5px solid rgba(245,158,11,0.2)",
                      }}
                    >
                      <FaShieldAlt className="text-xl text-amber-500" />
                    </motion.div>
                  </div>

                  <div className="space-y-2 text-center">
                    <h3 className="text-base font-bold text-slate-700">Two-Factor Verification</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Enter the 6-digit code sent to your email address.
                    </p>
                  </div>

                  <div className="relative group pt-1">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-amber-400/60 group-focus-within:text-amber-500 transition-colors">
                      <FaLock className="text-sm" />
                    </div>
                    <input
                      id="admin-mfa-code"
                      type="text"
                      required
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                      className={
                        inputBase + " !text-center !tracking-[0.35em] !font-extrabold !text-lg"
                      }
                      placeholder="000000"
                    />
                  </div>

                  <motion.button
                    id="admin-mfa-submit"
                    type="submit"
                    disabled={verifying}
                    whileHover={{ scale: verifying ? 1 : 1.015, y: verifying ? 0 : -1 }}
                    whileTap={{ scale: verifying ? 1 : 0.975 }}
                    className="w-full py-3.5 rounded-2xl font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 text-sm transition-all duration-200"
                    style={{
                      background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #dc2626 100%)",
                      backgroundSize: "200% 200%",
                      boxShadow: "0 6px 24px rgba(245,158,11,0.25), 0 2px 8px rgba(234,88,12,0.15)",
                    }}
                  >
                    <span className="flex items-center justify-center gap-2.5">
                      {verifying ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <FaShieldAlt className="text-xs opacity-80" />
                          <span>Verify & Sign In</span>
                        </>
                      )}
                    </span>
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMfa(false);
                      setMfaCode("");
                      setMfaToken(null);
                    }}
                    className="w-full text-center text-xs font-semibold text-amber-600/60 hover:text-amber-700 transition-colors py-1.5"
                  >
                    ← Back to login
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Footer ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-10 text-center"
          >
            <p className="text-[11px] text-slate-300">
              &copy; {new Date().getFullYear()} {siteConfig.company.name}. All rights reserved.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
