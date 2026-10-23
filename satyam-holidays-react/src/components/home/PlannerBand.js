import React from "react";
import { Link } from "react-router-dom";
import { PiArrowRight, PiSparkle } from "react-icons/pi";
import Img from "../ui/Img";

const BAND_IMAGE = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4";

const PlannerBand = () => (
  <section className="container-site py-6">
    <div className="grain relative isolate overflow-hidden rounded-4xl bg-ink-950 text-white">
      <Img
        src={BAND_IMAGE}
        alt=""
        width={1600}
        wrapperClassName="absolute inset-0 -z-10"
        className="opacity-60"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950 via-ink-950/80 to-ink-950/20" />
      <div className="grid gap-8 px-6 py-14 md:grid-cols-12 md:items-center md:px-14 md:py-20">
        <div className="md:col-span-7">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs text-white/80">
            <PiSparkle className="h-3.5 w-3.5 text-saffron-400" /> Trip planner
          </p>
          <h2 className="text-balance font-display text-display-md font-light">
            Not sure where to go yet?{" "}
            <em className="accent-italic !text-saffron-300">Sketch it out first.</em>
          </h2>
          <p className="mt-4 max-w-lg text-white/70">
            Pick a destination, how many days and what you enjoy. You'll get a day-by-day draft in
            seconds — then a planner turns it into a real, bookable trip.
          </p>
        </div>
        <div className="md:col-span-5 md:flex md:justify-end">
          <Link to="/ai-planner" className="btn btn-light btn-lg">
            Try the planner <PiArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  </section>
);

export default PlannerBand;
