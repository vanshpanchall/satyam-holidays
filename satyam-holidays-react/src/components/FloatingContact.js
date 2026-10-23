import React from "react";
import { PiPhone, PiWhatsappLogo } from "react-icons/pi";
import { useSiteConfig } from "../contexts/SettingsContext";
import { toTel, toWhatsApp } from "../utils/format";

/** WhatsApp + call shortcuts pinned bottom-right; `raised` lifts them above a sticky booking bar. */
const FloatingContact = ({ raised = false }) => {
  const { company } = useSiteConfig();

  return (
    <div
      className={`fixed right-4 z-30 flex flex-col gap-3 transition-[bottom] md:right-6 ${
        raised ? "bottom-24 lg:bottom-6" : "bottom-5 md:bottom-6"
      }`}
    >
      <a
        href={toTel(company.phones[0])}
        aria-label={`Call ${company.phones[0]}`}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-fg shadow-lg shadow-ink-950/10 transition hover:-translate-y-0.5 md:hidden"
      >
        <PiPhone className="h-5 w-5" />
      </a>
      <a
        href={toWhatsApp(company.whatsapp, "Hi Satyam Holidays, I have a question about a trip.")}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="group flex h-12 items-center gap-2 rounded-full bg-[#1f9d55] pl-3.5 pr-3.5 text-white shadow-lg shadow-ink-950/20 transition hover:-translate-y-0.5 md:pr-5"
      >
        <PiWhatsappLogo className="h-6 w-6" />
        <span className="hidden text-sm font-medium md:inline">Chat with us</span>
      </a>
    </div>
  );
};

export default FloatingContact;
