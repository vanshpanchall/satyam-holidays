import React, { Suspense } from "react";
import Meta from "./Meta";
import Header from "./Header";
import DeferredMount from "./DeferredMount";
import Hero from "./Hero";
import { lazyWithRecovery } from "../utils/lazyWithRecovery";

const Services = lazyWithRecovery(() => import("./Services"), "home-services");
const About = lazyWithRecovery(() => import("./About"), "home-about");
const DomesticPackages = lazyWithRecovery(() => import("./DomesticPackages"), "home-domestic");
const InternationalPackages = lazyWithRecovery(
  () => import("./InternationalPackages"),
  "home-international"
);
const Enquiry = lazyWithRecovery(() => import("./Enquiry"), "home-enquiry");
const Contact = lazyWithRecovery(() => import("./Contact"), "home-contact");
const Footer = lazyWithRecovery(() => import("./Footer"), "home-footer");

const SectionPlaceholder = ({ height }) => (
  <div aria-hidden="true" style={{ minHeight: height, width: "100%" }} />
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
        <div id="services" className="scroll-mt-24 md:scroll-mt-28">
          <DeferredMount
            fallback={<SectionPlaceholder height="70vh" />}
            rootMargin="0px 0px -25% 0px"
          >
            <Suspense fallback={<SectionPlaceholder height="70vh" />}>
              <Services sectionId={null} />
            </Suspense>
          </DeferredMount>
        </div>
        <div id="about" className="scroll-mt-24 md:scroll-mt-28">
          <DeferredMount
            fallback={<SectionPlaceholder height="80vh" />}
            rootMargin="0px 0px -25% 0px"
          >
            <Suspense fallback={<SectionPlaceholder height="80vh" />}>
              <About sectionId={null} />
            </Suspense>
          </DeferredMount>
        </div>
        <div id="packages" className="scroll-mt-24 md:scroll-mt-28">
          <DeferredMount
            fallback={<SectionPlaceholder height="120vh" />}
            rootMargin="0px 0px -25% 0px"
          >
            <Suspense fallback={<SectionPlaceholder height="120vh" />}>
              <DomesticPackages sectionId={null} />
              <InternationalPackages />
            </Suspense>
          </DeferredMount>
        </div>
        <div id="enquiry" className="scroll-mt-24 md:scroll-mt-28">
          <DeferredMount
            fallback={<SectionPlaceholder height="85vh" />}
            rootMargin="0px 0px -25% 0px"
          >
            <Suspense fallback={<SectionPlaceholder height="85vh" />}>
              <Enquiry sectionId={null} />
            </Suspense>
          </DeferredMount>
        </div>
        <div id="contact" className="scroll-mt-24 md:scroll-mt-28">
          <DeferredMount
            fallback={<SectionPlaceholder height="95vh" />}
            rootMargin="0px 0px -25% 0px"
          >
            <Suspense fallback={<SectionPlaceholder height="95vh" />}>
              <Contact sectionId={null} />
            </Suspense>
          </DeferredMount>
        </div>
      </main>
      <DeferredMount fallback={<SectionPlaceholder height="24vh" />} rootMargin="0px 0px -20% 0px">
        <Suspense fallback={<SectionPlaceholder height="24vh" />}>
          <Footer />
        </Suspense>
      </DeferredMount>
    </>
  );
};

export default Home;
