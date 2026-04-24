import React, { memo } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { FaMapMarkerAlt, FaClock, FaStar, FaGlobe } from "react-icons/fa";
import { resolveImageUrl } from "../config/siteConfig";
import OptimizedImage from "./OptimizedImage";

/**
 * Memoized Package Card component to prevent unnecessary re-renders
 */
const PackageCard = memo(function PackageCard({ pkg, onClick, showVisa = false }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(pkg);
    } else {
      navigate(`/packages/${pkg.slug || pkg.id || pkg._id}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const imageUrl = resolveImageUrl(pkg.image);

  return (
    <div
      className="glass-card rounded-2xl group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-navy-900"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`View details for ${pkg.name} package at ${pkg.location}`}
    >
      {/* Package Image */}
      <div className="relative h-48 overflow-hidden rounded-t-xl">
        <OptimizedImage
          src={imageUrl}
          alt={pkg.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          aspectRatio="4/3"
          objectFit="cover"
        />
        <div className="absolute top-4 right-4 bg-primary-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
          {pkg.price}
        </div>
        {showVisa && pkg.visa && (
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-white shadow-lg border border-white/20">
            <FaGlobe className="inline mr-1 text-secondary-400" aria-hidden="true" />
            {pkg.visa}
          </div>
        )}
        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-white shadow-lg border border-white/20">
          <FaMapMarkerAlt className="inline mr-1 text-primary-400" aria-hidden="true" />
          {pkg.location}
        </div>
      </div>

      {/* Package Content */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-navy-900 dark:text-white group-hover:text-primary-500 transition-colors duration-300">
            {pkg.name}
          </h3>
          <div className="flex items-center">
            <FaStar className="text-yellow-400 mr-1" aria-hidden="true" />
            <span className="text-sm font-medium text-navy-700 dark:text-navy-200">
              {pkg.rating}
            </span>
            <span className="text-xs text-navy-500 dark:text-navy-400 ml-1">({pkg.reviews})</span>
          </div>
        </div>

        <p className="text-navy-700 dark:text-navy-200 mb-4 leading-relaxed line-clamp-2">
          {pkg.description}
        </p>

        <div className="flex items-center text-sm text-navy-600 dark:text-navy-300 mb-4">
          <FaClock className="mr-2" aria-hidden="true" />
          {pkg.duration}
        </div>

        {/* Highlights */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-navy-900 dark:text-white mb-2">Highlights:</h4>
          <div className="flex flex-wrap gap-2">
            {pkg.highlights?.slice(0, 4).map((highlight, idx) => (
              <span
                key={idx}
                className="px-2 py-1 glass-badge text-primary-700 dark:text-primary-300 text-xs rounded-full"
              >
                {highlight}
              </span>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          className="w-full btn btn-primary min-h-[44px]"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
        >
          View Details
        </button>
      </div>
    </div>
  );
});

PackageCard.propTypes = {
  pkg: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
    name: PropTypes.string.isRequired,
    location: PropTypes.string.isRequired,
    price: PropTypes.string.isRequired,
    rating: PropTypes.number,
    reviews: PropTypes.number,
    duration: PropTypes.string,
    description: PropTypes.string,
    highlights: PropTypes.arrayOf(PropTypes.string),
    image: PropTypes.string,
    visa: PropTypes.string,
  }).isRequired,
  onClick: PropTypes.func,
  showVisa: PropTypes.bool,
};

export default PackageCard;
