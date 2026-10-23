import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PiArrowLeft,
  PiEnvelopeSimple,
  PiEye,
  PiEyeSlash,
  PiLock,
  PiShieldCheck,
} from "react-icons/pi";
import { toast } from "react-toastify";
import { apiUrl, safeJson, toastApiError } from "../../config/siteConfig";
import { useSiteConfig } from "../../contexts/SettingsContext";
import { markAdminAuthenticated } from "./adminAuthCache";

const LOGIN_PHOTO =
  "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=1400&q=70&auto=format&fit=crop";

const AdminLogin = () => {
  const { company } = useSiteConfig();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mfaToken, setMfaToken] = useState(null);
  const [mfaCode, setMfaCode] = useState("");

  const finishLogin = (json, message) => {
    if (json.token) localStorage.setItem("adminToken", json.token);
    markAdminAuthenticated();
    toast.success(message);
    navigate("/admin");
  };

  const post = async (path, body) => {
    const res = await fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });
    return { res, json: await safeJson(res) };
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { res, json } = await post("/api/auth/login", { email, password });
      if (res.ok && json.success) {
        if (json.mfaRequired) {
          setMfaToken(json.mfaToken);
          toast.info("A verification code was sent to your email.");
        } else {
          finishLogin(json, "Welcome back");
        }
      } else {
        toastApiError(json, "Those credentials didn't work");
      }
    } catch (err) {
      toastApiError(err, "Couldn't reach the server");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e) => {
    e.preventDefault();
    if (mfaCode.length < 6) {
      toastApiError("Enter the 6-digit verification code");
      return;
    }
    setLoading(true);
    try {
      const { res, json } = await post("/api/auth/verify-mfa", { mfaToken, code: mfaCode });
      if (res.ok && json.success) finishLogin(json, "Verified — welcome back");
      else toastApiError(json, "That code is invalid or has expired");
    } catch (err) {
      toastApiError(err, "Couldn't reach the server");
    } finally {
      setLoading(false);
    }
  };

  const inputWrap = "relative";
  const icon =
    "pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted";

  return (
    <div className="grid min-h-screen bg-page lg:grid-cols-[1.1fr_1fr]">
      <aside className="grain relative hidden overflow-hidden bg-ink-950 lg:block">
        <img
          src={LOGIN_PHOTO}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-ink-950/30" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <a
            href="/"
            className="inline-flex w-fit items-center gap-2 text-sm text-white/70 hover:text-white"
          >
            <PiArrowLeft className="h-4 w-4" /> Back to website
          </a>
          <div>
            <p className="font-display text-5xl font-light leading-tight">
              Every enquiry is{" "}
              <em className="accent-italic !text-saffron-300">someone's holiday.</em>
            </p>
            <p className="mt-4 max-w-sm text-white/70">
              Sign in to follow up on leads, keep trips up to date and manage the site.
            </p>
          </div>
        </div>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <a href="/" className="mb-10 flex items-center gap-3 lg:hidden">
            <img
              src={company.logo}
              alt=""
              className="h-10 w-10 rounded-full bg-white object-contain p-1"
            />
            <span className="font-display text-xl">{company.name}</span>
          </a>

          {mfaToken ? (
            <form onSubmit={handleMfaVerify} className="space-y-6">
              <div>
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-saffron-500/10 text-accent">
                  <PiShieldCheck className="h-6 w-6" />
                </span>
                <h1 className="font-display text-3xl text-fg">Check your email</h1>
                <p className="mt-2 text-sm text-muted">Enter the 6-digit code we just sent you.</p>
              </div>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                aria-label="Verification code"
                placeholder="000000"
                className="field h-14 text-center font-display text-2xl tracking-[0.5em]"
              />
              <button type="submit" disabled={loading} className="btn btn-ink btn-lg w-full">
                {loading ? "Verifying…" : "Verify and sign in"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMfaToken(null);
                  setMfaCode("");
                }}
                className="w-full text-sm text-muted underline underline-offset-4 hover:text-fg"
              >
                Use a different account
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <h1 className="font-display text-4xl font-light text-fg">Welcome back</h1>
                <p className="mt-2 text-sm text-muted">Sign in to the {company.name} admin.</p>
              </div>
              <div>
                <label htmlFor="adm-email" className="label">
                  Email
                </label>
                <div className={inputWrap}>
                  <PiEnvelopeSimple className={icon} />
                  <input
                    id="adm-email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="field pl-11"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="adm-password" className="label">
                  Password
                </label>
                <div className={inputWrap}>
                  <PiLock className={icon} />
                  <input
                    id="adm-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field pl-11 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-fg"
                  >
                    {showPassword ? (
                      <PiEyeSlash className="h-[18px] w-[18px]" />
                    ) : (
                      <PiEye className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn btn-ink btn-lg w-full">
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}
          <p className="mt-10 text-xs text-muted">
            Authorised staff only. Activity on this portal is logged.
          </p>
        </div>
      </main>
    </div>
  );
};

export default AdminLogin;
