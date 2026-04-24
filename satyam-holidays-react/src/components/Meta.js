import { useEffect } from "react";

const DEFAULT_OG_IMAGE = "https://satyamholidays.vercel.app/og-cover.jpg";
const SITE_URL = "https://satyamholidays.vercel.app";

function Meta({ title, description, image, url, canonical, keywords }) {
  useEffect(() => {
    if (title) {
      document.title = title;
      setMetaTag('meta[property="og:title"]', "property", "og:title", title);
      setMetaTag('meta[name="twitter:title"]', "name", "twitter:title", title);
    }
    if (description) {
      setMetaTag('meta[name="description"]', "name", "description", description);
      setMetaTag('meta[property="og:description"]', "property", "og:description", description);
      setMetaTag('meta[name="twitter:description"]', "name", "twitter:description", description);
    }
    if (keywords) {
      setMetaTag('meta[name="keywords"]', "name", "keywords", keywords);
    }

    // Image (always set to ensure OG previews work)
    const ogImage = image || DEFAULT_OG_IMAGE;
    setMetaTag('meta[property="og:image"]', "property", "og:image", ogImage);
    setMetaTag('meta[name="twitter:image"]', "name", "twitter:image", ogImage);
    setMetaTag('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");

    // URL
    const pageUrl = url || SITE_URL;
    setMetaTag('meta[property="og:url"]', "property", "og:url", pageUrl);

    // Canonical link for SEO
    const canonicalUrl = canonical || url || SITE_URL;
    setLinkTag('link[rel="canonical"]', "canonical", canonicalUrl);

    // Always set og:type and og:site_name for better previews
    setMetaTag('meta[property="og:type"]', "property", "og:type", "website");
    setMetaTag('meta[property="og:site_name"]', "property", "og:site_name", "Satyam Holidays");
    setMetaTag('meta[property="og:locale"]', "property", "og:locale", "en_IN");
  }, [title, description, image, url, canonical, keywords]);

  return null;
}

function setMetaTag(selector, attrName, attrValue, content) {
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  if (content !== undefined && content !== null) {
    el.setAttribute("content", content);
  }
}

function setLinkTag(selector, rel, href) {
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export default Meta;
