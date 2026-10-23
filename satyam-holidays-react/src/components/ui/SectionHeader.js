import React from "react";
import Accent from "./Accent";
import useReveal from "../../utils/useReveal";

/**
 * Editorial section header: eyebrow + serif title on the left, optional intro/action on the right.
 */
const SectionHeader = ({ eyebrow, title, intro, action, align = "split", as: Tag = "h2" }) => {
  const reveal = useReveal(0.2);
  const centered = align === "center";

  return (
    <div
      ref={reveal.ref}
      className={`${reveal.className} mb-10 md:mb-14 ${
        centered ? "mx-auto max-w-2xl text-center" : "grid gap-6 md:grid-cols-12 md:items-end"
      }`}
    >
      <div className={centered ? "" : "md:col-span-7"}>
        {eyebrow && <p className={`eyebrow mb-4 ${centered ? "justify-center" : ""}`}>{eyebrow}</p>}
        <Tag className="heading text-balance">
          <Accent text={title} />
        </Tag>
      </div>
      {(intro || action) && (
        <div
          className={
            centered
              ? "mt-5"
              : "flex flex-col gap-5 md:col-span-5 md:items-end md:pb-1 md:text-right"
          }
        >
          {intro && (
            <p className="max-w-md text-pretty text-[15px] leading-relaxed text-muted">{intro}</p>
          )}
          {action}
        </div>
      )}
    </div>
  );
};

export default SectionHeader;
