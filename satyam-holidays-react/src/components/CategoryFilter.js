import React, { memo } from "react";
import PropTypes from "prop-types";

/**
 * Category filter buttons component
 */
const CategoryFilter = memo(function CategoryFilter({
  categories,
  activeCategory,
  onCategoryChange,
}) {
  return (
    <div className="flex flex-wrap justify-center gap-4 mb-12" role="tablist">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          role="tab"
          aria-selected={activeCategory === category.id}
          aria-controls={`${category.id}-panel`}
          className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
            activeCategory === category.id
              ? "btn-primary text-white shadow-glow-primary"
              : "glass-card text-navy-700 dark:text-navy-200 hover:bg-white/90 dark:hover:bg-navy-700/80"
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
});

CategoryFilter.propTypes = {
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  activeCategory: PropTypes.string.isRequired,
  onCategoryChange: PropTypes.func.isRequired,
};

export default CategoryFilter;
