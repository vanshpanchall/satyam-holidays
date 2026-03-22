import React from "react";
import { FaSun, FaMoon } from "react-icons/fa";
import { useTheme } from "./ThemeProvider";

const ThemeToggle = ({ className = "" }) => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 focus:outline-none bg-gray-200 dark:bg-navy-800 border border-gray-300 dark:border-navy-600 shadow-inner ${className}`}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      role="switch"
      aria-checked={isDark}
      type="button"
    >
      <span
        className={`${
          isDark ? "translate-x-8" : "translate-x-1"
        } flex h-6 w-6 transform items-center justify-center rounded-full shadow-md transition-transform duration-300 bg-gradient-to-br from-primary-400 to-secondary-500`}
      >
        {isDark ? (
          <FaMoon className="h-4 w-4 text-white" />
        ) : (
          <FaSun className="h-4 w-4 text-white" />
        )}
      </span>
    </button>
  );
};

export default ThemeToggle;
