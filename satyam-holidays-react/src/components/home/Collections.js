import React from "react";
import { Link } from "react-router-dom";
import { PiArrowUpRight } from "react-icons/pi";
import { useSetting } from "../../contexts/SettingsContext";
import SectionHeader from "../ui/SectionHeader";
import Img from "../ui/Img";
import { asArray } from "../../utils/format";

// Bento layout for up to 6 tiles on a 4-column grid
const SPANS = [
  "col-span-2 lg:row-span-2",
  "",
  "",
  "lg:col-span-2",
  "lg:col-span-2",
  "lg:col-span-2",
];

const collectionHref = (item) => {
  const params = new URLSearchParams();
  if (item.query) params.set("q", item.query);
  if (item.category) params.set("category", item.category);
  return `/packages${params.toString() ? `?${params}` : ""}`;
};

const Collections = () => {
  const items = asArray(useSetting("home.collections"))
    .filter((c) => c && c.title)
    .slice(0, 6);
  if (!items.length) return null;

  return (
    <section className="section anchor" id="collections">
      <div className="container-site">
        <SectionHeader
          eyebrow="Ways to travel"
          title="Start with the kind of trip *you have in mind.*"
          intro="Pilgrimages paced for parents, honeymoons that aren't a checklist, and long weekends that actually feel like a break."
        />

        <div className="grid auto-rows-[200px] grid-cols-2 gap-3 sm:auto-rows-[240px] md:gap-4 lg:auto-rows-[260px] lg:grid-cols-4">
          {items.map((item, i) => {
            const lastOdd = i === items.length - 1 && (items.length - 1) % 2 === 1;
            return (
              <Link
                key={item.title}
                to={collectionHref(item)}
                className={`group relative isolate overflow-hidden rounded-3xl ${SPANS[i]} ${
                  lastOdd ? "col-span-2 lg:col-span-2" : ""
                }`}
              >
                <Img
                  src={item.image}
                  alt=""
                  width={i === 0 ? 1200 : 800}
                  sizes={
                    i === 0 ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 1024px) 50vw, 25vw"
                  }
                  className="transition-transform duration-[1.4s] ease-out-expo group-hover:scale-[1.07]"
                  wrapperClassName="absolute inset-0 -z-10"
                />
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950/80 via-ink-950/10 to-transparent" />
                <div className="flex h-full flex-col justify-between p-5 text-white md:p-6">
                  <span className="self-end rounded-full bg-white/15 p-2.5 backdrop-blur transition group-hover:bg-white group-hover:text-ink-900">
                    <PiArrowUpRight className="h-4 w-4" />
                  </span>
                  <div>
                    <h3
                      className={`font-display font-light leading-tight ${
                        i === 0 ? "text-3xl md:text-5xl" : "text-xl md:text-2xl"
                      }`}
                    >
                      {item.title}
                    </h3>
                    {item.subtitle && (
                      <p className="mt-1.5 text-sm text-white/75">{item.subtitle}</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Collections;
