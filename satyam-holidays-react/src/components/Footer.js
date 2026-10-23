import React from "react";
import { Link } from "react-router-dom";
import {
  PiArrowUpRight,
  PiFacebookLogo,
  PiInstagramLogo,
  PiTwitterLogo,
  PiWhatsappLogo,
  PiYoutubeLogo,
} from "react-icons/pi";
import { useSiteConfig } from "../contexts/SettingsContext";
import { toTel, toWhatsApp } from "../utils/format";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { label: "All packages", to: "/packages" },
      { label: "India holidays", to: "/packages?category=domestic" },
      { label: "International", to: "/packages?category=international" },
      { label: "Chardham Yatra", to: "/packages?q=chardham" },
      { label: "Kashmir", to: "/packages?q=kashmir" },
    ],
  },
  {
    title: "Plan",
    links: [
      { label: "Trip planner", to: "/ai-planner" },
      { label: "Compare packages", to: "/compare" },
      { label: "Saved trips", to: "/wishlist" },
      { label: "Send an enquiry", to: "/#enquiry" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", to: "/#about" },
      { label: "Contact", to: "/#contact" },
      { label: "Privacy policy", to: "/privacy-policy" },
      { label: "Terms & conditions", to: "/terms" },
      { label: "Cancellation & refunds", to: "/refund-policy" },
    ],
  },
];

const Footer = () => {
  const siteConfig = useSiteConfig();
  const { company, social } = siteConfig;
  const year = new Date().getFullYear();

  const socials = [
    { label: "Instagram", href: social.instagram, Icon: PiInstagramLogo },
    { label: "Facebook", href: social.facebook, Icon: PiFacebookLogo },
    { label: "YouTube", href: social.youtube, Icon: PiYoutubeLogo },
    { label: "X (Twitter)", href: social.twitter, Icon: PiTwitterLogo },
    { label: "WhatsApp", href: toWhatsApp(company.whatsapp), Icon: PiWhatsappLogo },
  ].filter((s) => s.href);

  return (
    <footer className="relative overflow-hidden bg-ink-950 text-white">
      <div className="container-site pt-20 md:pt-28">
        {/* Closing call to action */}
        <div className="grid gap-10 border-b border-white/10 pb-16 md:grid-cols-12 md:items-end">
          <h2 className="font-display text-display-lg font-light md:col-span-8">
            Where to <em className="accent-italic !text-saffron-400">next?</em>
          </h2>
          <div className="flex flex-wrap gap-3 md:col-span-4 md:justify-end">
            <Link to="/#enquiry" className="btn btn-accent btn-lg">
              Start planning
            </Link>
            <a
              href={toWhatsApp(
                company.whatsapp,
                "Hi Satyam Holidays, I'd like help planning a trip."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-glass btn-lg"
            >
              <PiWhatsappLogo className="h-5 w-5" /> WhatsApp us
            </a>
          </div>
        </div>

        <div className="grid gap-12 py-16 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="flex items-center gap-3">
              <img
                src={company.logo}
                alt=""
                className="h-11 w-11 rounded-full bg-white object-contain p-1"
                loading="lazy"
              />
              <div>
                <p className="font-display text-xl">{company.name}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  {company.tagline}
                </p>
              </div>
            </div>
            <address className="mt-8 space-y-1 text-sm not-italic leading-relaxed text-white/60">
              <p>{company.address.line1}</p>
              <p>{company.address.line2}</p>
              <p>{company.address.country}</p>
            </address>
            <div className="mt-6 space-y-1 text-sm">
              {company.phones.map((p) => (
                <a key={p} href={toTel(p)} className="link-underline block w-fit text-white/80">
                  {p}
                </a>
              ))}
              <a
                href={`mailto:${company.email}`}
                className="link-underline block w-fit text-white/80"
              >
                {company.email}
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:col-span-8">
            {COLUMNS.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <p className="mb-5 text-[11px] uppercase tracking-[0.2em] text-white/40">
                  {col.title}
                </p>
                <ul className="space-y-3 text-[15px]">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link to={link.to} className="link-underline text-white/75 hover:text-white">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6 border-t border-white/10 py-8 text-sm text-white/45 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {company.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            {socials.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-white/40 hover:text-white"
              >
                <Icon className="h-[18px] w-[18px]" />
              </a>
            ))}
          </div>
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2 text-white/60 hover:text-white"
          >
            Back to top <PiArrowUpRight className="h-4 w-4 -rotate-45" />
          </a>
        </div>
      </div>

      {/* Oversized wordmark — decorative */}
      <p
        aria-hidden="true"
        className="pointer-events-none select-none whitespace-nowrap px-4 pb-4 text-center font-display text-[18vw] leading-[0.8] tracking-tight text-white/[0.04]"
      >
        {company.name}
      </p>
    </footer>
  );
};

export default Footer;
