import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaLock, FaEnvelope, FaEye, FaEyeSlash, FaArrowLeft, FaShieldAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { apiUrl } from "../../config/siteConfig";
import { useSiteConfig } from "../../contexts/SettingsContext";

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

      const json = await res.json();
      if (res.ok && json.success) {
        if (json.mfaRequired) {
          setMfaToken(json.mfaToken);
          setShowMfa(true);
          toast.info("Verification code dispatched to your email address.");
        } else {
          if (json.token) {
            localStorage.setItem("adminToken", json.token);
          }
          toast.success("Welcome back, Administrator!");
          navigate("/admin");
        }
      } else {
        toast.error(json.message || "Invalid credentials provided");
      }
    } catch (err) {
      toast.error("Unable to establish connection to server");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e) => {
    e.preventDefault();
    if (mfaCode.length < 6) {
      toast.error("Please enter a valid 6-digit verification code");
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

      const json = await res.json();
      if (res.ok && json.success) {
        if (json.token) {
          localStorage.setItem("adminToken", json.token);
        }
        toast.success("MFA verified. Welcome back!");
        navigate("/admin");
      } else {
        toast.error(json.message || "Invalid or expired verification code");
      }
    } catch (err) {
      toast.error("Unable to establish connection to server");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex md:grid md:grid-cols-12 bg-slate-950 font-sans text-white overflow-hidden">
      {/* Left Visual Column - Control Center Panel (Visible on md and up) */}
      <div className="hidden md:flex md:col-span-5 lg:col-span-7 relative flex-col justify-between p-12 lg:p-16 bg-slate-950 border-r border-slate-800/60 overflow-hidden select-none">
        {/* Floating Illuminated Orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{
              x: [0, 80, 0],
              y: [0, -100, 0],
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[120px]"
          />
          <motion.div
            animate={{
              x: [0, -60, 0],
              y: [0, 80, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute bottom-[-10%] right-[-10%] w-[450px] h-[450px] rounded-full bg-orange-600/10 blur-[100px]"
          />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Top Header - Back Button */}
        <div className="relative z-10">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-500 transition-colors text-xs font-semibold tracking-wider uppercase group"
          >
            <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
            Back to Website
          </a>
        </div>

        {/* Center Panel Copy & Graphics Mock */}
        <div className="relative z-10 my-auto max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-6"
          >
            <span className="p-2 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20 text-sm">
              <FaShieldAlt />
            </span>
            <span className="text-xs uppercase tracking-widest text-amber-500 font-bold">
              Secure Operations
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight mb-4"
          >
            Satyam Holidays <br />
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 bg-clip-text text-transparent">
              Control Center
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-slate-400 leading-relaxed text-sm lg:text-base font-medium mb-8"
          >
            Welcome to the unified administrative management console. Curate luxury travel packages,
            oversee bookings, moderate reviews, and customize experiences from one centralized
            secure terminal.
          </motion.p>

          {/* CSS-only Premium Tech Dashboard Mock */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="w-full h-44 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl p-4 overflow-hidden relative"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-800/80 mb-3">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
              </div>
              <span className="text-[10px] text-slate-500 tracking-widest font-mono uppercase">
                session: active
              </span>
            </div>
            <div className="space-y-2.5 font-mono text-[10px] text-slate-400">
              <p className="text-amber-500/80">$ initialize --service_name="satyam-holidays-api"</p>
              <p className="text-slate-500">
                &gt; [OK] Connected to MongoDB Cluster (Atlas/Remote)
              </p>
              <p className="text-slate-500">&gt; [OK] Redis Cache Server Listening on Port 6379</p>
              <div className="flex gap-2 pt-2 items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] text-slate-400">
                  Services operating nominally (200 OK)
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-slate-500 font-medium">
          &copy; {new Date().getFullYear()} {siteConfig.company.name} Inc. All rights reserved.
        </div>
      </div>

      {/* Right Column - Login Form Container */}
      <div className="col-span-12 md:col-span-7 lg:col-span-5 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 bg-slate-900/50 backdrop-blur-sm relative">
        {/* Floating gradient orb for right side mobile backgrounds */}
        <div className="absolute inset-0 pointer-events-none md:hidden overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-amber-500/5 blur-[100px]" />
        </div>

        {/* Back link for mobile viewports */}
        <div className="absolute top-6 left-6 md:hidden">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold"
          >
            <FaArrowLeft /> Home
          </a>
        </div>

        <div className="w-full max-w-sm relative z-10">
          {/* Logo Branding */}
          <div className="text-center mb-10 flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="relative p-[1.5px] rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-amber-500 mb-5 shadow-2xl"
            >
              {/* Logo Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl blur-md opacity-25" />
              <div className="relative w-16 h-16 rounded-[14px] bg-slate-950 flex items-center justify-center p-1.5 overflow-hidden">
                <img
                  src={siteConfig.company.logo}
                  alt={`${siteConfig.company.name} logo`}
                  className="w-full h-full object-contain rounded-lg logo-animate"
                />
              </div>
            </motion.div>

            <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1.5">
              Welcome back
            </h1>
            <p className="text-slate-450 text-xs font-medium">
              Enter your credentials to access the admin portal
            </p>
          </div>

          {/* Form Switching Container */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {!showMfa ? (
                <motion.form
                  key="login-form"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleLogin}
                  className="space-y-5"
                >
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Email Address
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-amber-550 transition-colors">
                        <FaEnvelope className="text-xs" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/80 focus:ring-4 focus:ring-amber-500/5 transition-all text-xs font-medium"
                        placeholder="admin@satyamholidays.com"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Password
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-amber-550 transition-colors">
                        <FaLock className="text-xs" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-800 bg-slate-950/60 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/80 focus:ring-4 focus:ring-amber-500/5 transition-all text-xs font-medium"
                        placeholder="••••••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-white transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <FaEyeSlash className="text-xs" />
                        ) : (
                          <FaEye className="text-xs" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.01 }}
                    whileTap={{ scale: loading ? 1 : 0.99 }}
                    className="relative w-full py-3.5 rounded-xl font-bold text-slate-950 disabled:cursor-not-allowed group overflow-hidden mt-6 text-xs tracking-wider uppercase bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:brightness-105 active:brightness-95 transition-all shadow-lg shadow-amber-500/10"
                  >
                    <span className="relative flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                          <span>Authenticating...</span>
                        </>
                      ) : (
                        <>
                          <FaLock className="text-xs" />
                          <span>Verify Identity</span>
                        </>
                      )}
                    </span>
                  </motion.button>
                </motion.form>
              ) : (
                <motion.form
                  key="mfa-form"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleMfaVerify}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">
                      Verification Code Required
                    </label>
                    <p className="text-[11px] text-slate-450 leading-relaxed text-center">
                      Enter the 6-digit secure MFA passcode sent to your authorized email address.
                    </p>
                    <div className="relative group pt-2">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-amber-550 transition-colors">
                        <FaLock className="text-xs" />
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                        className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-800 bg-slate-950/60 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/80 focus:ring-4 focus:ring-amber-500/5 transition-all text-center tracking-[0.3em] font-bold text-sm"
                        placeholder="000000"
                      />
                    </div>
                  </div>

                  {/* Verify & Sign In Button */}
                  <motion.button
                    type="submit"
                    disabled={verifying}
                    whileHover={{ scale: verifying ? 1 : 1.01 }}
                    whileTap={{ scale: verifying ? 1 : 0.99 }}
                    className="w-full py-3.5 rounded-xl font-bold text-slate-950 disabled:cursor-not-allowed uppercase text-xs tracking-wider bg-gradient-to-r from-amber-400 to-orange-500 shadow-lg shadow-amber-500/10"
                  >
                    <span className="flex items-center justify-center gap-2">
                      {verifying ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                          <span>Verifying Passcode...</span>
                        </>
                      ) : (
                        <>
                          <FaLock className="text-xs" />
                          <span>Verify & Establish Session</span>
                        </>
                      )}
                    </span>
                  </motion.button>

                  {/* Cancel / Back Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMfa(false);
                      setMfaCode("");
                      setMfaToken(null);
                    }}
                    className="w-full text-center text-xs font-semibold text-slate-450 hover:text-white transition-colors py-1.5"
                  >
                    Cancel and return
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Encryption Notice Footer */}
          <div className="mt-12 text-center text-[10px] text-slate-500 font-medium">
            Protected by enterprise-grade cryptographic authentication protocols.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
