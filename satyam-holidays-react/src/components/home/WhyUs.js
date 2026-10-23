import React from "react";
import { useSetting } from "../../contexts/SettingsContext";
import Img from "../ui/Img";
import Accent from "../ui/Accent";
import { asArray } from "../../utils/format";
import useReveal from "../../utils/useReveal";

const WHY_IMAGE = "https://images.unsplash.com/photo-1598091383021-15ddea10925d";

const Point = ({ item, index }) => {
  const reveal = useReveal(0.2);
  return (
    <li
      ref={reveal.ref}
      className={`${reveal.className} grid grid-cols-[3rem_1fr] gap-4 border-t border-line py-8 first:border-t-0 first:pt-0 md:grid-cols-[4.5rem_1fr]`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <span className="font-display text-sm text-accent tabular-nums">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div>
        <h3 className="font-display text-2xl leading-snug text-fg">{item.title}</h3>
        <p className="mt-2 max-w-md leading-relaxed text-muted">{item.text}</p>
      </div>
    </li>
  );
};

const WhyUs = () => {
  const items = asArray(useSetting("home.highlights")).filter((h) => h && h.title);
  if (!items.length) return null;

  return (
    <section className="section">
      <div className="container-site grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
            <p className="eyebrow mb-4">Why travel with us</p>
            <h2 className="heading text-balance">
              <Accent text="The difference is in *the details we handle.*" />
            </h2>
            <div className="mt-10 hidden aspect-[4/5] overflow-hidden rounded-3xl lg:block">
              <Img
                src={WHY_IMAGE}
                alt="Meadows and snow peaks in Kashmir"
                width={900}
                sizes="40vw"
              />
            </div>
          </div>
        </div>
        <ol className="lg:col-span-6 lg:col-start-7 lg:pt-24">
          {items.map((item, i) => (
            <Point key={item.title} item={item} index={i} />
          ))}
        </ol>
      </div>
    </section>
  );
};

export default WhyUs;
