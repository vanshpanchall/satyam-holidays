import React from "react";
import {
  PiArrowUpRight,
  PiEnvelopeSimple,
  PiMapPin,
  PiPhone,
  PiWhatsappLogo,
} from "react-icons/pi";
import { useSiteConfig } from "../contexts/SettingsContext";
import SectionHeader from "./ui/SectionHeader";
import { toTel, toWhatsApp } from "../utils/format";

const Row = ({ icon: Icon, label, children }) => (
  <div className="grid grid-cols-[2.5rem_1fr] gap-4 border-t border-line py-6">
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-saffron-500/10 text-accent">
      <Icon className="h-[18px] w-[18px]" />
    </span>
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <div className="mt-1.5 space-y-1 text-fg">{children}</div>
    </div>
  </div>
);

const Contact = ({ sectionId = "contact" }) => {
  const { company } = useSiteConfig();
  const directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${company.name}, ${company.address.line1}, ${company.address.line2}`
  )}`;

  return (
    <section id={sectionId || undefined} className="section anchor">
      <div className="container-site">
        <SectionHeader
          eyebrow="Visit or call"
          title="Come by for chai and *a proper chat.*"
          intro="Most trips start with a conversation. Drop into the office, call, or message — whichever is easiest."
        />

        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Row icon={PiMapPin} label="Office">
              <address className="not-italic leading-relaxed">
                {company.address.line1}
                <br />
                {company.address.line2}, {company.address.country}
              </address>
              <a
                href={directions}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm text-accent"
              >
                Get directions <PiArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </Row>
            <Row icon={PiPhone} label="Phone">
              {company.phones.map((p) => (
                <a key={p} href={toTel(p)} className="link-underline block w-fit">
                  {p}
                </a>
              ))}
            </Row>
            <Row icon={PiEnvelopeSimple} label="Email">
              <a href={`mailto:${company.email}`} className="link-underline block w-fit break-all">
                {company.email}
              </a>
            </Row>
            <Row icon={PiWhatsappLogo} label="Office hours">
              <p className="text-sm leading-relaxed text-muted">
                {company.hours.weekdays}
                <br />
                {company.hours.saturday}
                <br />
                {company.hours.sunday}
              </p>
            </Row>
            <div className="border-t border-line pt-6">
              <div className="rounded-2xl bg-raised p-5">
                <p className="font-medium text-fg">Already travelling and need help?</p>
                <p className="mt-1 text-sm text-muted">
                  Our emergency line is for guests currently on a trip with us.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={toTel(company.emergencyPhone)} className="btn btn-ink">
                    <PiPhone className="h-4 w-4" /> {company.emergencyPhone}
                  </a>
                  <a
                    href={toWhatsApp(company.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                  >
                    <PiWhatsappLogo className="h-4 w-4" /> WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-[360px] overflow-hidden rounded-4xl border border-line lg:col-span-7">
            {company.mapEmbed ? (
              <iframe
                src={company.mapEmbed}
                title={`${company.name} office location`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                className="h-full min-h-[360px] w-full border-0 grayscale-[35%] dark:invert-[0.9] dark:hue-rotate-180"
              />
            ) : (
              <a
                href={directions}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-full items-center justify-center bg-raised text-muted"
              >
                Open in Google Maps
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
