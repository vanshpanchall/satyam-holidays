import React from "react";
import { useLocation } from "react-router-dom";

/**
 * CSS-only fade between routes. Keyed by pathname so it replays on navigation
 * but not on query-string changes (filters) or in-page anchors.
 */
const PageTransition = ({ children }) => {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="animate-[fade-in_0.35s_ease-out_both]">
      {children}
    </div>
  );
};

export default PageTransition;
