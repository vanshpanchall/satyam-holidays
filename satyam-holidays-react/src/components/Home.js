import React, { Suspense, useMemo } from "react";
import Meta from "./Meta";
import SiteLayout from "./SiteLayout";
import Hero from "./Hero";
import DeferredMount from "./DeferredMount";
import DestinationStrip from "./home/DestinationStrip";
import Collections from "./home/Collections";
import FeaturedTrips from "./home/FeaturedTrips";
import usePackageCatalog from "../utils/usePackageCatalog";
import { lazyWithRecovery } from "../utils/lazyWithRecovery";

// Below-the-fold sections load as the visitor scrolls
const WhyUs = lazyWithRecovery(() => import("./home/WhyUs"), "home-why");
const AboutStory = lazyWithRecovery(() => import("./home/AboutStory"), "home-about");
const Testimonials = lazyWithRecovery(() => import("./home/Testimonials"), "home-testimonials");
const PlannerBand = lazyWithRecovery(() => import("./home/PlannerBand"), "home-planner");
const Faq = lazyWithRecovery(() => import("./home/Faq"), "home-faq");
const Enquiry = lazyWithRecovery(() => import("./Enquiry"), "home-enquiry");
const Contact = lazyWithRecovery(() => import("./Contact"), "home-contact");

const Lazy = ({ children, minHeight = "60vh", id }) => (
  <div id={id} className={id ? "anchor" : undefined}>
    <DeferredMount fallback={<div style={{ minHeight }} />} rootMargin="800px 0px">
      <Suspense fallback={<div style={{ minHeight }} />}>{children}</Suspense>
    </DeferredMount>
  </div>
);

const Home = () => {
  const { packages, loading, error, retry } = usePackageCatalog();

  const locations = useMemo(() => {
    const seen = new Set();
    packages.forEach((p) =>
      String(p.location || "")
        .split(/[,&/]| - /)
        .map((s) => s.trim())
        .filter((s) => s.length > 2 && s.length < 24)
        .forEach((s) => seen.add(s))
    );
    return Array.from(seen);
  }, [packages]);

  return (
    <SiteLayout overlay>
      <Meta
        title="Satyam Holidays — Tour Packages from Ahmedabad | Chardham, Kashmir, Dubai & more"
        description="Satyam Holidays is a family-run travel agency in Ahmedabad planning Chardham Yatra, Kashmir, Kerala, Rajasthan, Dubai, Singapore and Thailand tours. Personalised itineraries and on-trip support."
        keywords="Satyam Holidays, travel agency Ahmedabad, Chardham Yatra package, Kashmir tour package, Dubai tour from Ahmedabad, honeymoon packages, family tour packages, Gujarat travel agent"
        url="https://satyamholidays.vercel.app/"
      />
      <Hero locations={locations} />
      <DestinationStrip locations={locations} />
      <Collections />
      <FeaturedTrips packages={packages} loading={loading} error={error} onRetry={retry} />
      <Lazy>
        <WhyUs />
      </Lazy>
      {/* Wrappers own the #about / #enquiry / #contact anchors so links work before sections mount */}
      <Lazy id="about" minHeight="80vh">
        <AboutStory sectionId={null} />
      </Lazy>
      <Lazy minHeight="40vh">
        <Testimonials />
      </Lazy>
      <Lazy minHeight="40vh">
        <PlannerBand />
      </Lazy>
      <Lazy>
        <Faq />
      </Lazy>
      <Lazy id="enquiry" minHeight="90vh">
        <Enquiry sectionId={null} />
      </Lazy>
      <Lazy id="contact" minHeight="70vh">
        <Contact sectionId={null} />
      </Lazy>
    </SiteLayout>
  );
};

export default Home;
