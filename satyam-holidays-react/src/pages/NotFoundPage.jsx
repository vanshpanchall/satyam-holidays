import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import SiteLayout from "../components/SiteLayout";
import Meta from "../components/Meta";

const NotFoundPage = () => {
  // Keep stray URLs out of search results
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  return (
    <SiteLayout>
      <Meta title="Page not found | Satyam Holidays" />
      <div className="container-site flex min-h-[60vh] flex-col justify-center py-24">
        <p className="font-display text-[clamp(6rem,20vw,14rem)] font-light leading-none text-fg/10">
          404
        </p>
        <h1 className="-mt-6 font-display text-display-md font-light text-fg md:-mt-12">
          Looks like a <em className="accent-italic">wrong turn.</em>
        </h1>
        <p className="mt-4 max-w-md text-muted">
          The page you were looking for has moved or never existed. Let's get you back on the road.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/" className="btn btn-ink">
            Go home
          </Link>
          <Link to="/packages" className="btn btn-ghost">
            Browse trips
          </Link>
        </div>
      </div>
    </SiteLayout>
  );
};

export default NotFoundPage;
