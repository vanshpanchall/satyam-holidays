import React, { memo, useState } from "react";
import { imageUrl } from "../../utils/format";

const WIDTHS = [480, 768, 1080, 1440, 1920];
const resizable = (src) =>
  !!src && (src.includes("images.unsplash.com") || src.includes("res.cloudinary.com"));

/**
 * Responsive image with srcset for Unsplash/Cloudinary, native lazy-loading
 * and a soft fade-in. `className` styles the <img>; the wrapper fills its parent.
 */
const Img = memo(function Img({
  src,
  alt = "",
  width = 1080,
  sizes = "100vw",
  priority = false,
  className = "",
  wrapperClassName = "",
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        aria-hidden="true"
        className={`flex items-center justify-center bg-gradient-to-br from-ink-800 to-ink-950 ${
          /absolute/.test(wrapperClassName) ? "" : "h-full w-full"
        } ${wrapperClassName}`}
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-white/20" fill="currentColor">
          <path d="M14 6l-3.75 5 2.85 3.8-1.6 1.2C9.81 13.75 7 10 7 10l-6 8h22L14 6z" />
        </svg>
      </div>
    );
  }

  const srcSet = resizable(src)
    ? WIDTHS.map((w) => `${imageUrl(src, w)} ${w}w`).join(", ")
    : undefined;

  return (
    <div
      className={`${
        /absolute/.test(wrapperClassName) ? "" : "relative h-full w-full"
      } overflow-hidden bg-ink-900/10 ${wrapperClassName}`}
    >
      <img
        src={imageUrl(src, width)}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchpriority={priority ? "high" : undefined}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover transition-opacity duration-700 ${
          loaded ? "opacity-100" : "opacity-0"
        } ${className}`}
      />
    </div>
  );
});

export default Img;
