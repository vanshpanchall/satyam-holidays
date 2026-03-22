import { useEffect } from "react";

function Meta({ title, description, image, url, canonical }) {
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
    if (image) {
      setMetaTag('meta[property="og:image"]', "property", "og:image", image);
      setMetaTag('meta[name="twitter:image"]', "name", "twitter:image", image);
      setMetaTag('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    }
    if (url) {
      setMetaTag('meta[property="og:url"]', "property", "og:url", url);
    }
    // Canonical link for SEO
    const canonicalUrl = canonical || url;
    if (canonicalUrl) {
      setLinkTag('link[rel="canonical"]', "canonical", canonicalUrl);
    }
    // Always set og:type for better previews
    setMetaTag('meta[property="og:type"]', "property", "og:type", "website");
  }, [title, description, image, url, canonical]);

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
