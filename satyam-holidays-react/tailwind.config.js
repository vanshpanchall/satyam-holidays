/** @type {import('tailwindcss').Config} */

// Brand scales. `saffron` is the accent, `ink` the deep navy used for text and dark surfaces.
const saffron = {
  50: "#fff6ed",
  100: "#ffead4",
  200: "#ffd1a8",
  300: "#ffb46a",
  400: "#ff9335",
  500: "#f57c20",
  600: "#e06614",
  700: "#b94e10",
  800: "#933f14",
  900: "#773514",
  950: "#401907",
};

const ink = {
  50: "#f4f7f9",
  100: "#e9eef2",
  200: "#d5dde4",
  300: "#b3c0cc",
  400: "#8597a9",
  500: "#5b6f84",
  600: "#3a5068",
  700: "#22384f",
  800: "#17293d",
  900: "#0f1e2e",
  950: "#070e17",
};

// Semantic tokens resolve to CSS variables (see index.css) so dark mode needs no `dark:` duplicates.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  darkMode: "class",
  // scripts/ holds the pre-render templates, whose classes must exist in the built CSS
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./scripts/**/*.js"],
  theme: {
    extend: {
      colors: {
        saffron,
        ink,
        // Legacy names still used by admin screens and shared components
        primary: saffron,
        amber: saffron,
        orange: saffron,
        navy: ink,
        sand: {
          50: "#fbf8f3",
          100: "#f6f1ea",
          200: "#ece3d6",
          300: "#ddcfbb",
        },
        page: token("page"),
        surface: token("surface"),
        raised: token("raised"),
        fg: token("fg"),
        muted: token("muted"),
        line: token("line"),
        accent: token("accent"),
        "series-1": token("series-1"),
        "series-2": token("series-2"),
        "series-3": token("series-3"),
      },
      fontFamily: {
        sans: ["Geist", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
      },
      fontSize: {
        "display-xl": [
          "clamp(2.75rem, 7vw, 6.25rem)",
          { lineHeight: "1", letterSpacing: "-0.02em" },
        ],
        "display-lg": [
          "clamp(2.25rem, 4.8vw, 4.25rem)",
          { lineHeight: "1.02", letterSpacing: "-0.025em" },
        ],
        "display-md": [
          "clamp(1.75rem, 3.2vw, 2.75rem)",
          { lineHeight: "1.08", letterSpacing: "-0.02em" },
        ],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      maxWidth: {
        site: "84rem",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "ken-burns": {
          from: { transform: "scale(1.04)" },
          to: { transform: "scale(1.14)" },
        },
      },
      animation: {
        marquee: "marquee 40s linear infinite",
        "fade-up": "fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
        "ken-burns": "ken-burns 9s ease-out both",
      },
    },
  },
  plugins: [],
};
