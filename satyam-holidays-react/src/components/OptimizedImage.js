import React, { useState, useRef, useEffect, memo } from "react";
import PropTypes from "prop-types";

/**
 * Optimized image component with lazy loading, srcSet support, and error handling
 */
const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className = "",
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  aspectRatio = "16/9",
  objectFit = "cover",
  placeholder = "blur",
  onLoad,
  onError,
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  // Generate srcSet for responsive images (if using Cloudinary or similar)
  const generateSrcSet = (baseSrc) => {
    if (!baseSrc || !baseSrc.includes("cloudinary")) {
      return undefined;
    }

    const widths = [320, 480, 640, 768, 1024, 1280];
    return widths
      .map((w) => {
        // Transform Cloudinary URL to include width
        const transformed = baseSrc.replace(/\/upload\//, `/upload/w_${w},q_auto,f_auto/`);
        return `${transformed} ${w}w`;
      })
      .join(", ");
  };

  const handleLoad = (e) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e) => {
    setHasError(true);
    onError?.(e);
  };

  // Intersection Observer for true lazy loading
  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute("data-src");
            }
            observer.unobserve(img);
          }
        });
      },
      {
        rootMargin: "50px 0px",
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, []);

  const srcSet = generateSrcSet(src);
  const placeholderColor = "bg-gray-200 dark:bg-gray-700";

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center ${placeholderColor} ${className}`}
        style={{ aspectRatio }}
        role="img"
        aria-label={alt || "Image unavailable"}
      >
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative" style={{ aspectRatio }}>
      {/* Placeholder skeleton */}
      {!isLoaded && placeholder === "blur" && (
        <div
          className={`absolute inset-0 ${placeholderColor} animate-pulse`}
          style={{ aspectRatio }}
        />
      )}

      <img
        ref={imgRef}
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        className={`${className} ${isLoaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
        style={{ objectFit, aspectRatio }}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  );
});

OptimizedImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  className: PropTypes.string,
  sizes: PropTypes.string,
  aspectRatio: PropTypes.string,
  objectFit: PropTypes.oneOf(["cover", "contain", "fill", "none", "scale-down"]),
  placeholder: PropTypes.oneOf(["blur", "none"]),
  onLoad: PropTypes.func,
  onError: PropTypes.func,
};

export default OptimizedImage;
