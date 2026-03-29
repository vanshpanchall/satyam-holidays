import React, { lazy, Suspense } from "react";
import Meta from "./Meta";
import Header from "./Header";
import Hero from "./Hero";
import {
  ServicesSkeleton,
  AboutSkeleton,
  PackagesSkeleton,
  EnquirySkeleton,
  ContactSkeleton,
  FooterSkeleton,
} from "./SkeletonLoaders";

const Services = lazy(() => import("./Services"));
const About = lazy(() => import("./About"));
const DomesticPackages = lazy(() => import("./DomesticPackages"));
const InternationalPackages = lazy(() => import("./InternationalPackages"));
const Enquiry = lazy(() => import("./Enquiry"));
const Contact = lazy(() => import("./Contact"));
const Footer = lazy(() => import("./Footer"));

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
        <Suspense fallback={<ServicesSkeleton />}>
          <Services />
        </Suspense>
        <Suspense fallback={<AboutSkeleton />}>
          <About />
        </Suspense>
        <Suspense fallback={<PackagesSkeleton />}>
          <DomesticPackages />
        </Suspense>
        <Suspense fallback={<PackagesSkeleton />}>
          <InternationalPackages />
        </Suspense>
        <Suspense fallback={<EnquirySkeleton />}>
          <Enquiry />
        </Suspense>
        <Suspense fallback={<ContactSkeleton />}>
          <Contact />
        </Suspense>
      </main>
      <Suspense fallback={<FooterSkeleton />}>
        <Footer />
      </Suspense>
    </>
  );
};

export default Home;
