import React, { lazy, Suspense } from "react";
import Meta from "./Meta";
import Header from "./Header";
import Hero from "./Hero";

const Services = lazy(() => import("./Services"));
const About = lazy(() => import("./About"));
const DomesticPackages = lazy(() => import("./DomesticPackages"));
const InternationalPackages = lazy(() => import("./InternationalPackages"));
const Enquiry = lazy(() => import("./Enquiry"));
const Contact = lazy(() => import("./Contact"));
const Footer = lazy(() => import("./Footer"));

const SectionFallback = () => (
  <div className="flex items-center justify-center py-16">
    <div className="loading-spinner" />
  </div>
);

const Home = () => {
  return (
    <>
      <Meta
        title="Satyam Holidays — Journey With Joy!"
        description="Discover curated domestic and international travel packages with Satyam Holidays. Personalized itineraries, expert guidance, and joyful journeys."
      />
      <Header />
      <main>
        <Hero />
        <Suspense fallback={<SectionFallback />}>
          <Services />
          <About />
          <DomesticPackages />
          <InternationalPackages />
          <Enquiry />
          <Contact />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </>
  );
};

export default Home;
