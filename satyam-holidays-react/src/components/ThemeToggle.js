import React from "react";
import { PiMoon, PiSun } from "react-icons/pi";
import { useTheme } from "./ThemeProvider";

const ThemeToggle = ({ className = "icon-btn" }) => {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={className}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
    >
      {isDark ? <PiSun className="h-[18px] w-[18px]" /> : <PiMoon className="h-[18px] w-[18px]" />}
    </button>
  );
};

export default ThemeToggle;
