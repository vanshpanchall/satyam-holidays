import React from "react";
import { Link } from "react-router-dom";
import { useSetting } from "../../contexts/SettingsContext";
import Accent from "../ui/Accent";
import Img from "../ui/Img";
import { asArray } from "../../utils/format";
import useReveal from "../../utils/useReveal";

const AboutStory = ({ sectionId = "about" }) => {
  const heading = useSetting("about.heading");
  const body = useSetting("about.body");
  const image = useSetting("about.image");
  const caption = useSetting("about.imageCaption");
  const stats = asArray(useSetting("hero.stats")).filter((s) => s && s.label);
  const reveal = useReveal(0.15);

  return (
    <section id={sectionId || undefined} className="section anchor bg-ink-900 text-white">
      <div className="container-site">
        <div
          ref={reveal.ref}
          className={`${reveal.className} grid gap-12 lg:grid-cols-12 lg:items-center`}
        >
          <figure className="relative lg:col-span-6">
            <div className="aspect-[4/5] overflow-hidden rounded-3xl sm:aspect-[5/4] lg:aspect-[4/5]">
              <Img
                src={image}
                alt={caption || ""}
                width={1100}
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            {caption && (
              <figcaption className="absolute bottom-4 left-4 rounded-full bg-ink-950/60 px-4 py-2 text-xs text-white/80 backdrop-blur">
                {caption}
              </figcaption>
            )}
          </figure>

          <div className="lg:col-span-5 lg:col-start-8">
            <p className="mb-4 inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-white/60">
              <span className="h-px w-6 bg-saffron-400" /> About us
            </p>
            <h2 className="text-balance font-display text-display-md font-light">
              <Accent text={heading} />
            </h2>
            <p className="mt-6 text-pretty text-lg leading-relaxed text-white/75">{body}</p>

            {stats.length > 0 && (
              <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-white/15 pt-8">
                {stats.map((s) => (
                  <div key={s.label}>
                    <dd className="font-display text-3xl font-light md:text-4xl">
                      {Number(s.value).toLocaleString("en-IN")}
                      <span className="text-saffron-400">{s.suffix}</span>
                    </dd>
                    <dt className="mt-1 text-xs uppercase tracking-[0.14em] text-white/55">
                      {s.label}
                    </dt>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/#enquiry" className="btn btn-accent">
                Talk to a planner
              </Link>
              <Link to="/#contact" className="btn btn-glass">
                Visit our office
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutStory;
