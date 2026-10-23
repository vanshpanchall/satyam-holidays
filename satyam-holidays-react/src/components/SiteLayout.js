import React from "react";
import Header from "./Header";
import Footer from "./Footer";
import FloatingContact from "./FloatingContact";

/**
 * Public page shell. `overlay` lets the page's first section sit under a transparent header
 * (homepage hero); otherwise content is offset by the measured header height.
 */
const SiteLayout = ({ children, overlay = false, floatingRaised = false }) => (
  <>
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-page"
    >
      Skip to content
    </a>
    <Header overlay={overlay} />
    <main
      id="main-content"
      style={overlay ? undefined : { paddingTop: "var(--header-h, 4.5rem)" }}
      className="min-h-[60vh]"
    >
      {children}
    </main>
    {/* Pages with a fixed mobile booking bar need room below the footer */}
    <div className={floatingRaised ? "bg-ink-950 pb-20 lg:pb-0" : undefined}>
      <Footer />
    </div>
    <FloatingContact raised={floatingRaised} />
  </>
);

export default SiteLayout;
