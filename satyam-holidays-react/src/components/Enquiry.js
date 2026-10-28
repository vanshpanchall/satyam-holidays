import React, { useRef, useState, Suspense } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  PiCheckCircle,
  PiPaperPlaneTilt,
  PiPhone,
  PiWarningCircle,
  PiWhatsappLogo,
} from "react-icons/pi";
import { useToast } from "./ToastProvider";
import { apiUrl } from "../config/siteConfig";
import { csrfFetch, refreshCsrfToken } from "../utils/csrf";
import { useSiteConfig } from "../contexts/SettingsContext";
import { lazyWithRecovery } from "../utils/lazyWithRecovery";
import { toTel, toWhatsApp } from "../utils/format";
import { BUDGETS } from "../pages/packagesFilters";
import Accent from "./ui/Accent";
import Select from "./ui/Select";
import CaptchaFit from "./ui/CaptchaFit";
import { DESTINATIONS } from "../config/enquiryOptions";

const ReCAPTCHA = lazyWithRecovery(() => import("react-google-recaptcha"), "enquiry-recaptcha");
const HCaptcha = lazyWithRecovery(() => import("@hcaptcha/react-hcaptcha"), "enquiry-hcaptcha");

const TRAVELLERS = ["1", "2", "3", "4", "5+"];

const STEPS = [
  {
    title: "We call you back",
    text: "A planner gets in touch to understand dates, budget and who's travelling.",
  },
  {
    title: "You get a draft",
    text: "Day-by-day itinerary with hotels and a clear, itemised quote.",
  },
  {
    title: "Tweak, then book",
    text: "Change anything you like. Confirm with an advance and we handle the rest.",
  },
];

const ChoiceChips = ({ name, options, register }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => (
      <label key={opt.value} className="cursor-pointer">
        <input type="radio" value={opt.value} {...register(name)} className="peer sr-only" />
        <span className="chip peer-checked:border-fg peer-checked:bg-fg peer-checked:text-page peer-focus-visible:ring-2 peer-focus-visible:ring-saffron-500">
          {opt.label}
        </span>
      </label>
    ))}
  </div>
);

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
    control,
    formState: { errors },
  } = useForm({ defaultValues: { travelers: "2", destination: "" } });

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

      // Drop empty optional fields so Joi doesn't see empty strings
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
          source: "homepage",
          captchaToken: currentToken || undefined,
        }).filter(([, v]) => v !== undefined && v !== null && v !== "")
      );

      // Ensure CSRF cookie exists before sending state-changing request
      const apiBase = apiUrl("").replace(/\/$/, "");
      await refreshCsrfToken(apiBase);

      const sendRequest = () =>
        csrfFetch(apiUrl("/api/enquiries"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

      let response = await sendRequest();
      let resJson = await response.json().catch(() => null);

      // Retry once if CSRF token expired/missing between initial token refresh and submit.
      if (!response.ok && (resJson?.code === "CSRF_MISSING" || resJson?.code === "CSRF_INVALID")) {
        await refreshCsrfToken(apiBase);
        response = await sendRequest();
        resJson = await response.json().catch(() => null);
      }

      if (response.ok && resJson && resJson.success) {
        setSubmitStatus("success");
        reset();
        setCaptchaToken("");
        show("Enquiry sent — we'll be in touch soon.", { type: "success" });
      } else {
        setSubmitStatus("error");
        const msg =
          (resJson &&
            (resJson.message ||
              resJson.error ||
              (resJson.errors && resJson.errors.join(", ")) ||
              resJson.code)) ||
          "Request failed";
        setErrorMsg(msg);
        show(`Couldn't send your enquiry: ${msg}`, { type: "error" });
      }
    } catch {
      setSubmitStatus("error");
      show("Something went wrong while sending your enquiry.", { type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const fieldClass = (hasError) => `field ${hasError ? "field-error" : ""}`;

  return (
    <section id={sectionId || undefined} className="section anchor border-t border-line bg-surface">
      <div className="container-site">
        <div className="grid overflow-hidden rounded-4xl border border-line lg:grid-cols-12">
          {/* Context panel */}
          <aside className="flex min-w-0 flex-col justify-between gap-10 bg-raised p-5 sm:p-7 md:gap-12 md:p-12 lg:col-span-5">
            <div>
              <p className="eyebrow mb-4">Plan a trip</p>
              <h2 className="heading text-balance">
                <Accent text="Tell us a little. *We'll do the rest.*" />
              </h2>
              <p className="mt-5 max-w-sm leading-relaxed text-muted">
                No payment, no obligation. Share what you have in mind — even a rough idea is enough
                to start.
              </p>
            </div>

            <ol className="space-y-6">
              {STEPS.map((step, i) => (
                <li key={step.title} className="grid grid-cols-[2.25rem_1fr] gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line font-display text-sm text-accent">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-fg">{step.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="flex flex-wrap gap-3 border-t border-line pt-8">
              <a href={toTel(siteConfig.company.phones[0])} className="btn btn-ghost">
                <PiPhone className="h-4 w-4" /> {siteConfig.company.phones[0]}
              </a>
              <a
                href={toWhatsApp(siteConfig.company.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
              >
                <PiWhatsappLogo className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          </aside>

          {/* Form */}
          <div className="min-w-0 bg-surface p-5 sm:p-7 md:p-12 lg:col-span-7">
            {submitStatus === "success" ? (
              <div
                className="flex h-full flex-col items-start justify-center gap-5 py-10"
                role="status"
              >
                <PiCheckCircle className="h-12 w-12 text-emerald-600" />
                <h3 className="font-display text-3xl text-fg">Thank you — we've got it.</h3>
                <p className="max-w-md leading-relaxed text-muted">
                  A planner will call or WhatsApp you shortly. You should also receive a
                  confirmation email.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitStatus(null)}
                  className="btn btn-ghost"
                >
                  Send another enquiry
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="grid gap-5 sm:grid-cols-2"
              >
                {submitStatus === "error" && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200 sm:col-span-2"
                  >
                    <PiWarningCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>We couldn't send your enquiry. {errorMsg}</span>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label htmlFor="enq-name" className="label">
                    Your name *
                  </label>
                  <input
                    id="enq-name"
                    type="text"
                    autoComplete="name"
                    {...register("name", {
                      required: "Please tell us your name",
                      minLength: { value: 2, message: "Name looks too short" },
                    })}
                    className={fieldClass(errors.name)}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "enq-name-error" : undefined}
                  />
                  {errors.name && (
                    <p id="enq-name-error" className="mt-1.5 text-sm text-red-600">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="enq-phone" className="label">
                    Phone / WhatsApp *
                  </label>
                  <input
                    id="enq-phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+91"
                    {...register("phone", {
                      required: "We need a number to call you back",
                      validate: (v) =>
                        String(v).replace(/\D/g, "").length >= 10 || "Enter at least 10 digits",
                    })}
                    className={fieldClass(errors.phone)}
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? "enq-phone-error" : undefined}
                  />
                  {errors.phone && (
                    <p id="enq-phone-error" className="mt-1.5 text-sm text-red-600">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="enq-email" className="label">
                    Email *
                  </label>
                  <input
                    id="enq-email"
                    type="email"
                    autoComplete="email"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "That email doesn't look right",
                      },
                    })}
                    className={fieldClass(errors.email)}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "enq-email-error" : undefined}
                  />
                  {errors.email && (
                    <p id="enq-email-error" className="mt-1.5 text-sm text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="enq-destination" className="label">
                    Where to?
                  </label>
                  <Controller
                    name="destination"
                    control={control}
                    render={({ field }) => (
                      <Select
                        id="enq-destination"
                        value={field.value || ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="Choose a destination"
                        options={DESTINATIONS}
                      />
                    )}
                  />
                </div>

                <div>
                  <label htmlFor="enq-date" className="label">
                    Rough travel date
                  </label>
                  <input
                    id="enq-date"
                    type="date"
                    min={today}
                    {...register("travelDate")}
                    className="field"
                  />
                </div>

                <fieldset className="sm:col-span-2">
                  <legend className="label">Travellers</legend>
                  <ChoiceChips
                    name="travelers"
                    register={register}
                    options={TRAVELLERS.map((t) => ({
                      value: t,
                      label: t === "5+" ? "5 or more" : t,
                    }))}
                  />
                </fieldset>

                <fieldset className="sm:col-span-2">
                  <legend className="label">Budget per person</legend>
                  <ChoiceChips
                    name="budget"
                    register={register}
                    options={BUDGETS.map((b) => ({ value: b.id, label: b.label }))}
                  />
                </fieldset>

                <div className="sm:col-span-2">
                  <label htmlFor="enq-message" className="label">
                    Anything else we should know?
                  </label>
                  <textarea
                    id="enq-message"
                    rows={4}
                    maxLength={1000}
                    {...register("message", { maxLength: 1000 })}
                    className="field resize-none"
                    placeholder="Senior citizens travelling, pure-veg food, a particular hotel, flights from Ahmedabad…"
                  />
                </div>

                {useCaptcha ? (
                  <div className="sm:col-span-2">
                    <Suspense
                      fallback={<p className="text-sm text-muted">Loading verification…</p>}
                    >
                      {PROVIDER === "hcaptcha" ? (
                        <CaptchaFit>
                          <HCaptcha
                            sitekey={HCAPTCHA_SITE_KEY}
                            onVerify={(val) => setCaptchaToken(val || "")}
                            onExpire={() => setCaptchaToken("")}
                          />
                        </CaptchaFit>
                      ) : PROVIDER === "recaptcha_v3" ? (
                        <>
                          <ReCAPTCHA
                            ref={recaptchaRef}
                            sitekey={RECAPTCHA_SITE_KEY}
                            size="invisible"
                            onChange={(val) => setCaptchaToken(val || "")}
                          />
                          <p className="text-xs text-muted">Protected by reCAPTCHA.</p>
                        </>
                      ) : (
                        <CaptchaFit>
                          <ReCAPTCHA
                            sitekey={RECAPTCHA_SITE_KEY}
                            onChange={(val) => setCaptchaToken(val || "")}
                            onExpired={() => setCaptchaToken("")}
                          />
                        </CaptchaFit>
                      )}
                    </Suspense>
                  </div>
                ) : null}

                <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted">We only use these details to plan your trip.</p>
                  <button
                    type="submit"
                    disabled={
                      isSubmitting || (PROVIDER !== "recaptcha_v3" && !!useCaptcha && !captchaToken)
                    }
                    className="btn btn-accent btn-lg w-full sm:w-auto"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Sending…
                      </>
                    ) : (
                      <>
                        Send enquiry <PiPaperPlaneTilt className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Enquiry;
