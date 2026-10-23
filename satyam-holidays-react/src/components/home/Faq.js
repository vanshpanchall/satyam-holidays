import React, { useId, useState } from "react";
import { PiPlus } from "react-icons/pi";
import { useSetting, useSiteConfig } from "../../contexts/SettingsContext";
import Accent from "../ui/Accent";
import { asArray, toWhatsApp } from "../../utils/format";

const FaqItem = ({ item, open, onToggle }) => {
  const id = useId();
  return (
    <div className="border-b border-line">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          className="flex w-full items-center justify-between gap-6 py-6 text-left"
        >
          <span className="font-display text-xl text-fg md:text-2xl">{item.q}</span>
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line transition-transform duration-300 ${
              open ? "rotate-45 border-fg bg-fg text-page" : ""
            }`}
          >
            <PiPlus className="h-4 w-4" />
          </span>
        </button>
      </h3>
      <div
        id={`${id}-panel`}
        role="region"
        className={`grid transition-[grid-template-rows] duration-500 ease-out-expo ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <p className="max-w-2xl pb-6 leading-relaxed text-muted">{item.a}</p>
        </div>
      </div>
    </div>
  );
};

const Faq = () => {
  const items = asArray(useSetting("home.faqs")).filter((f) => f && f.q && f.a);
  const { company } = useSiteConfig();
  const [openIndex, setOpenIndex] = useState(0);
  if (!items.length) return null;

  return (
    <section className="section" id="faq">
      <div className="container-site grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="eyebrow mb-4">Good to know</p>
          <h2 className="heading text-balance">
            <Accent text="Questions we *get asked a lot.*" />
          </h2>
          <p className="mt-5 max-w-sm text-muted">
            Can't find yours?{" "}
            <a
              href={toWhatsApp(company.whatsapp, "Hi, I have a question:")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg underline decoration-saffron-500 underline-offset-4"
            >
              Message us on WhatsApp
            </a>{" "}
            and a planner will get back to you.
          </p>
        </div>
        <div className="border-t border-line lg:col-span-7 lg:col-start-6">
          {items.map((item, i) => (
            <FaqItem
              key={item.q}
              item={item}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Faq;
