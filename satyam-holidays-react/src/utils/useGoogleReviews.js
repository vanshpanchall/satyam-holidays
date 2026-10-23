import { useEffect, useState } from "react";
import { apiUrl } from "../config/siteConfig";

// One request per page load, shared by the hero badge and the testimonials section.
let promise = null;

const load = () => {
  if (!promise) {
    promise = fetch(apiUrl("/api/reviews/google"))
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => (json?.success ? json.data : null))
      .catch(() => null);
  }
  return promise;
};

/** Returns Google rating data when configured ({ rating, totalReviews, reviews, mapsUrl, … }), else null. */
export default function useGoogleReviews() {
  const [data, setData] = useState(null);
  useEffect(() => {
    let active = true;
    load().then((d) => active && setData(d));
    return () => {
      active = false;
    };
  }, []);
  return data;
}
