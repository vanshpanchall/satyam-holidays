#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Post-build pre-renderer (runs automatically after `npm run build`).
 *
 * Crawlers and link previews (WhatsApp, Facebook, Bing) don't run the React app, so a plain SPA
 * looks like an empty page to them. This writes real HTML for each public route — title, meta,
 * Open Graph, JSON-LD and the page's actual text — using live data from the API:
 *
 *   build/index.html               homepage
 *   build/packages.html            all packages
 *   build/packages/<slug>.html     one per active package
 *   build/privacy-policy.html …    legal pages, planner, compare
 *   build/app.html                 untouched app shell; the host serves it for every other route
 *   build/sitemap.xml, robots.txt  generated from the same data
 *
 * React replaces the pre-rendered markup when it mounts, so visitors see the normal app.
 * The script never fails the build: if the API is unreachable it still writes app.html and the
 * static pages, and package pages fall back to the app shell until the next deploy.
 *
 * Env: BUILD_PATH (default "build"), REACT_APP_SITE_URL, PRERENDER_API_BASE.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const BUILD_DIR = path.resolve(process.env.BUILD_PATH || "build");
const SITE_URL = (process.env.REACT_APP_SITE_URL || "https://satyamholidays.vercel.app").replace(
  /\/$/,
  ""
);
const apiFromEnv = process.env.REACT_APP_API_BASE || "";
const API_BASE = (
  process.env.PRERENDER_API_BASE ||
  (apiFromEnv && !/localhost|127\.0\.0\.1/.test(apiFromEnv)
    ? apiFromEnv
    : "https://satyam-holidays.vercel.app")
).replace(/\/$/, "");
const TIMEOUT_MS = 15000;

/* ── helpers ─────────────────────────────────────────── */

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// JSON inside <script> must not be able to close the tag
const jsonLd = (obj, id) =>
  `<script type="application/ld+json"${id ? ` id="${id}"` : ""}>${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;

const plain = (text) =>
  String(text || "")
    .replace(/\*/g, "")
    .trim();
const truncate = (text, n) => {
  const t = plain(text).replace(/\s+/g, " ");
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};
const firstNumber = (price) => {
  const m = String(price || "").match(/\d[\d,]*/);
  return m ? parseInt(m[0].replace(/,/g, ""), 10) : 0;
};
const inr = (n) => `₹${new Intl.NumberFormat("en-IN").format(n || 0)}`;
const SAFE_SLUG = /^[a-z0-9][a-z0-9-]{0,150}$/;

const imageUrl = (url, width = 1200) => {
  if (!url) return `${SITE_URL}/og-cover.jpg`;
  if (url.startsWith("/uploads")) return `${API_BASE}${url}`;
  if (url.includes("images.unsplash.com"))
    return `${url.split("?")[0]}?w=${width}&q=72&auto=format&fit=crop`;
  if (
    url.includes("res.cloudinary.com") &&
    url.includes("/upload/") &&
    !url.includes("/upload/w_")
  ) {
    return url.replace("/upload/", `/upload/w_${width},q_auto,f_auto/`);
  }
  return url;
};

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function loadPackages() {
  const all = [];
  for (let page = 1; page <= 10; page += 1) {
    const json = await fetchJson(`${API_BASE}/api/v1/packages?limit=100&page=${page}`);
    if (!json.success || !Array.isArray(json.data)) throw new Error("unexpected package payload");
    all.push(...json.data);
    if (!json.pagination?.hasNextPage) break;
  }
  return all.filter((p) => p.isActive !== false);
}

// Same defaults the app falls back to (src/config/contentDefaults.js is an ES module, so evaluate it
// in a sandbox rather than require it). Live settings from the API always win.
function loadContentDefaults() {
  try {
    const file = path.resolve(__dirname, "../src/config/contentDefaults.js");
    const code = fs
      .readFileSync(file, "utf8")
      .replace(/export default\s+CONTENT_DEFAULTS;?/, "module.exports = CONTENT_DEFAULTS;");
    const sandbox = { module: { exports: {} } };
    vm.runInNewContext(code, sandbox, { timeout: 1000 });
    return sandbox.module.exports || {};
  } catch (err) {
    console.warn(`[prerender] content defaults unavailable: ${err.message}`);
    return {};
  }
}

/* ── head manipulation ───────────────────────────────── */

function setHead(html, { title, description, url, image, type = "website", robots, schemas = [] }) {
  let out = html;
  const metaName = (name, content) => {
    const re = new RegExp(`<meta\\s+name="${name}"[^>]*>`, "i");
    const tag = `<meta name="${name}" content="${esc(content)}" />`;
    out = re.test(out) ? out.replace(re, tag) : out.replace("</head>", `  ${tag}\n</head>`);
  };
  const metaProp = (prop, content) => {
    const re = new RegExp(`<meta\\s+property="${prop}"[^>]*>`, "i");
    const tag = `<meta property="${prop}" content="${esc(content)}" />`;
    out = re.test(out) ? out.replace(re, tag) : out.replace("</head>", `  ${tag}\n</head>`);
  };

  if (title) {
    out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
    metaProp("og:title", title);
    metaName("twitter:title", title);
  }
  if (description) {
    metaName("description", description);
    metaProp("og:description", description);
    metaName("twitter:description", description);
  }
  if (url) {
    metaProp("og:url", url);
    const canonical = `<link rel="canonical" href="${esc(url)}" />`;
    out = /<link\s+rel="canonical"[^>]*>/i.test(out)
      ? out.replace(/<link\s+rel="canonical"[^>]*>/i, canonical)
      : out.replace("</head>", `  ${canonical}\n</head>`);
  }
  if (image) {
    metaProp("og:image", image);
    metaName("twitter:image", image);
  }
  metaProp("og:type", type);
  if (robots) metaName("robots", robots);
  if (schemas.length) out = out.replace("</head>", `  ${schemas.join("\n  ")}\n</head>`);
  return out;
}

const withBody = (html, content) =>
  html.replace(/<div id="root">\s*<\/div>/, `<div id="root">${content}</div>`);

/* ── page templates (plain, readable HTML; React replaces it on load) ── */

const shellNav = (company) => `
<header class="border-b border-line">
  <div class="container-site flex h-[4.5rem] items-center justify-between">
    <a href="/" class="font-display text-xl text-fg">${esc(company)}</a>
    <nav aria-label="Primary" class="hidden gap-6 text-sm text-muted md:flex">
      <a href="/packages">Packages</a>
      <a href="/packages?category=domestic">India</a>
      <a href="/packages?category=international">International</a>
      <a href="/ai-planner">Trip planner</a>
      <a href="/#contact">Contact</a>
    </nav>
  </div>
</header>`;

const shellFooter = (s) => {
  const a = s["company.address"] || {};
  const phones = Array.isArray(s["company.phones"]) ? s["company.phones"] : [];
  return `
<footer class="border-t border-line py-10 text-sm text-muted">
  <div class="container-site space-y-2">
    <p class="font-display text-lg text-fg">${esc(s["company.name"])}</p>
    <address class="not-italic">${esc([a.line1, a.line2, a.country].filter(Boolean).join(", "))}</address>
    <p>${phones.map((p) => `<a href="tel:${esc(p.replace(/[^\d+]/g, ""))}">${esc(p)}</a>`).join(" · ")} · <a href="mailto:${esc(s["company.email"])}">${esc(s["company.email"])}</a></p>
    <p><a href="/privacy-policy">Privacy policy</a> · <a href="/terms">Terms</a> · <a href="/refund-policy">Cancellation &amp; refunds</a></p>
  </div>
</footer>`;
};

const page = (s, main) =>
  `${shellNav(s["company.name"])}<main id="main-content">${main}</main>${shellFooter(s)}`;

const packageList = (packages) => `
<ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
  ${packages
    .map(
      (p) => `<li class="card p-5">
    <a href="/packages/${esc(p.slug || p._id)}" class="font-display text-xl text-fg">${esc(p.name)}</a>
    <p class="mt-1 text-sm text-muted">${esc(p.location)} · ${esc(p.duration)} · from ${esc(inr(p.numericPrice || firstNumber(p.price)))} per person</p>
    <p class="mt-2 text-sm text-muted">${esc(truncate(p.description, 160))}</p>
  </li>`
    )
    .join("\n  ")}
</ul>`;

function renderHome(s, packages) {
  const faqs = (Array.isArray(s["home.faqs"]) ? s["home.faqs"] : []).filter((f) => f && f.q && f.a);
  const featured = [...packages]
    .sort((a, b) => Number(!!b.isFeatured) - Number(!!a.isFeatured))
    .slice(0, 12);
  const main = `
<section class="container-site py-16">
  <h1 class="font-display text-display-lg text-fg">${esc(plain(s["hero.heading"]))}</h1>
  <p class="mt-4 max-w-2xl text-muted">${esc(s["hero.subheading"])}</p>
  <p class="mt-6"><a class="btn btn-accent" href="/packages">Browse all trips</a></p>
</section>
${featured.length ? `<section class="container-site pb-16"><h2 class="heading mb-6">Popular trips</h2>${packageList(featured)}</section>` : ""}
<section class="container-site pb-16" id="about">
  <h2 class="heading">${esc(plain(s["about.heading"]))}</h2>
  <p class="mt-4 max-w-2xl text-muted">${esc(s["about.body"])}</p>
</section>
${
  faqs.length
    ? `<section class="container-site pb-16"><h2 class="heading mb-6">Questions we get asked a lot</h2><dl class="space-y-6">${faqs
        .map(
          (f) =>
            `<div><dt class="font-display text-xl text-fg">${esc(f.q)}</dt><dd class="mt-2 text-muted">${esc(f.a)}</dd></div>`
        )
        .join("")}</dl></section>`
    : ""
}`;
  const schemas = faqs.length
    ? [
        jsonLd({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      ]
    : [];
  return { main: page(s, main), schemas };
}

function renderPackage(s, p) {
  const url = `${SITE_URL}/packages/${p.slug}`;
  const price = p.numericPrice || firstNumber(p.price);
  const upcoming = (p.availableDates || [])
    .filter((d) => new Date(d.startDate) >= new Date() && d.status !== "sold_out")
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  const fmt = (d) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const list = (items, cls = "") =>
    `<ul class="mt-3 space-y-1 ${cls}">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  const itinerary = [...(p.itinerary || [])].sort((a, b) => a.day - b.day);

  const main = `
<article class="container-site py-12">
  <nav aria-label="Breadcrumb" class="text-sm text-muted"><a href="/">Home</a> / <a href="/packages?category=${esc(p.category)}">${p.category === "international" ? "International" : "India"}</a> / ${esc(p.name)}</nav>
  <h1 class="mt-4 font-display text-display-lg text-fg">${esc(p.name)}</h1>
  <p class="mt-3 text-muted">${esc(p.location)} · ${esc(p.duration)}${price ? ` · from ${esc(inr(price))} per person` : ""}${p.rating ? ` · ${esc(p.rating)}★ (${esc(p.reviews || 0)} reviews)` : ""}</p>
  <img src="${esc(imageUrl(p.image, 1200))}" alt="${esc(p.name)}" width="1200" height="675" class="mt-8 w-full rounded-4xl object-cover" />
  <section class="mt-10 max-w-3xl"><h2 class="heading">Overview</h2><p class="mt-4 whitespace-pre-line text-muted">${esc(p.description)}</p>${p.highlights?.length ? list(p.highlights, "text-fg") : ""}</section>
  ${
    itinerary.length
      ? `<section class="mt-10 max-w-3xl"><h2 class="heading">Day by day</h2><ol class="mt-4 space-y-4">${itinerary
          .map(
            (d) =>
              `<li><h3 class="font-display text-xl text-fg">Day ${esc(d.day)}: ${esc(d.title)}</h3><p class="text-muted">${esc(d.description)}</p></li>`
          )
          .join("")}</ol></section>`
      : ""
  }
  ${p.inclusions?.length ? `<section class="mt-10"><h2 class="heading">Included</h2>${list(p.inclusions, "text-muted")}</section>` : ""}
  ${p.exclusions?.length ? `<section class="mt-6"><h2 class="heading">Not included</h2>${list(p.exclusions, "text-muted")}</section>` : ""}
  ${
    upcoming.length
      ? `<section class="mt-10"><h2 class="heading">Upcoming departures</h2>${list(
          upcoming.map((d) => `${fmt(d.startDate)} – ${fmt(d.endDate)}`),
          "text-muted"
        )}</section>`
      : ""
  }
  <p class="mt-10"><a class="btn btn-accent" href="/#enquiry">Enquire about this trip</a></p>
</article>`;

  const schemas = [
    jsonLd(
      {
        "@context": "https://schema.org",
        "@type": "TouristTrip",
        name: p.name,
        description: truncate(p.description, 500),
        image: imageUrl(p.image, 1200),
        touristType: p.subcategory,
        url,
        ...(itinerary.length
          ? {
              itinerary: {
                "@type": "ItemList",
                itemListElement: itinerary.map((d, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  item: { "@type": "TouristAttraction", name: d.title, description: d.description },
                })),
              },
            }
          : {}),
        ...(p.rating && p.reviews
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: p.rating,
                reviewCount: p.reviews,
              },
            }
          : {}),
        offers: {
          "@type": "Offer",
          price,
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
          url,
          seller: { "@type": "TravelAgency", name: s["company.name"], url: SITE_URL },
        },
      },
      "structured-package-schema"
    ),
    jsonLd({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Packages", item: `${SITE_URL}/packages` },
        { "@type": "ListItem", position: 3, name: p.name, item: url },
      ],
    }),
  ];
  return {
    main: page(s, main),
    schemas,
    meta: {
      title: `${p.name} — ${p.duration} | ${s["company.name"]}`,
      description: truncate(`${p.name}: ${p.duration} in ${p.location}. ${p.description}`, 158),
      url,
      image: imageUrl(p.image, 1200),
      type: "product",
    },
  };
}

function renderLegal(s, text, title) {
  const blocks = String(text || "")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      const lines = b.split("\n");
      if (lines[0].startsWith("## ")) {
        const rest = lines.slice(1).join(" ").trim();
        return `<h2>${esc(lines[0].slice(3))}</h2>${rest ? `<p>${esc(rest)}</p>` : ""}`;
      }
      return `<p>${esc(lines.join(" "))}</p>`;
    })
    .join("");
  return page(
    s,
    `<article class="container-site max-w-3xl py-16"><h1 class="font-display text-display-md text-fg">${esc(title)}</h1><div class="prose-site mt-10">${blocks}</div></article>`
  );
}

/* ── sitemap & robots ────────────────────────────────── */

function sitemap(entries) {
  const urls = entries
    .map(
      (e) => `  <url>
    <loc>${esc(e.loc)}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ""}
    <changefreq>${e.changefreq || "weekly"}</changefreq>
    <priority>${e.priority || "0.5"}</priority>${
      e.image
        ? `\n    <image:image>\n      <image:loc>${esc(e.image)}</image:loc>\n      <image:title>${esc(e.imageTitle)}</image:title>\n    </image:image>`
        : ""
    }
  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>
`;
}

const robots = () => `# ${SITE_URL}
User-agent: *
Allow: /
Disallow: /admin
Disallow: /wishlist

Sitemap: ${SITE_URL}/sitemap.xml
`;

/* ── main ────────────────────────────────────────────── */

const write = (rel, content) => {
  const file = path.join(BUILD_DIR, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

async function main() {
  const indexPath = path.join(BUILD_DIR, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.warn(`[prerender] ${indexPath} not found — skipping`);
    return;
  }
  // 1. Untouched app shell first: every non-pre-rendered route is served this, so it must exist
  //    even if everything below fails. No canonical, so client routes don't all point at "/".
  //    Re-runs reuse it as the template, because index.html has already been pre-rendered by then.
  const appShellPath = path.join(BUILD_DIR, "app.html");
  if (!fs.existsSync(appShellPath)) {
    const original = fs.readFileSync(indexPath, "utf8");
    write("app.html", original.replace(/\s*<link\s+rel="canonical"[^>]*>/i, ""));
  }
  const shell = fs.readFileSync(appShellPath, "utf8");

  // 2. Data
  let settings = {};
  let packages = [];
  try {
    const json = await fetchJson(`${API_BASE}/api/v1/settings`);
    if (json.success && json.data) settings = json.data;
  } catch (err) {
    console.warn(`[prerender] settings unavailable from ${API_BASE}: ${err.message}`);
  }
  try {
    packages = await loadPackages();
  } catch (err) {
    console.warn(
      `[prerender] packages unavailable from ${API_BASE}: ${err.message} — package pages will use the app shell`
    );
  }
  settings = { "company.name": "Satyam Holidays", ...loadContentDefaults(), ...settings };
  const brand = settings["company.name"];

  // 3. Pages
  const home = renderHome(settings, packages);
  write(
    "index.html",
    withBody(
      setHead(shell, {
        title: `${brand} — Tour Packages from Ahmedabad | Chardham, Kashmir, Dubai & more`,
        description:
          truncate(settings["seo.description"] || settings["hero.subheading"], 158) || undefined,
        url: `${SITE_URL}/`,
        schemas: home.schemas,
      }),
      home.main
    )
  );

  write(
    "packages.html",
    withBody(
      setHead(shell, {
        title: `All holidays — Tour Packages | ${brand}`,
        description: `Browse ${packages.length || "all"} tour packages from ${brand}: Chardham Yatra, Kashmir, Kerala, Rajasthan, Dubai, Singapore, Thailand and more.`,
        url: `${SITE_URL}/packages`,
        schemas: packages.length
          ? [
              jsonLd({
                "@context": "https://schema.org",
                "@type": "ItemList",
                itemListElement: packages.map((p, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  url: `${SITE_URL}/packages/${p.slug || p._id}`,
                  name: p.name,
                })),
              }),
            ]
          : [],
      }),
      page(
        settings,
        `<section class="container-site py-16"><h1 class="font-display text-display-lg text-fg">All holidays</h1><p class="mt-3 text-muted">Every trip we run, in one place.</p><div class="mt-10">${packageList(packages)}</div></section>`
      )
    )
  );

  let written = 0;
  for (const p of packages) {
    if (!p.slug || !SAFE_SLUG.test(p.slug)) continue;
    const r = renderPackage(settings, p);
    write(
      `packages/${p.slug}.html`,
      withBody(setHead(shell, { ...r.meta, schemas: r.schemas }), r.main)
    );
    written += 1;
  }

  const legal = [
    ["privacy-policy", "legal.privacy", "Privacy policy"],
    ["terms", "legal.terms", "Terms & conditions"],
    ["refund-policy", "legal.refund", "Cancellation & refunds"],
  ];
  for (const [slug, key, title] of legal) {
    if (!settings[key]) continue;
    write(
      `${slug}.html`,
      withBody(
        setHead(shell, {
          title: `${title} | ${brand}`,
          description: `${title} for ${brand}.`,
          url: `${SITE_URL}/${slug}`,
        }),
        renderLegal(settings, settings[key], title)
      )
    );
  }

  write(
    "ai-planner.html",
    setHead(shell, {
      title: `Trip planner | ${brand}`,
      description: `Sketch a day-by-day itinerary in seconds, then have a ${brand} planner turn it into a bookable trip.`,
      url: `${SITE_URL}/ai-planner`,
    })
  );

  // 4. Sitemap + robots
  const today = new Date().toISOString().slice(0, 10);
  const entries = [
    { loc: `${SITE_URL}/`, lastmod: today, changefreq: "weekly", priority: "1.0" },
    { loc: `${SITE_URL}/packages`, lastmod: today, changefreq: "daily", priority: "0.9" },
    ...packages
      .filter((p) => p.slug && SAFE_SLUG.test(p.slug))
      .map((p) => ({
        loc: `${SITE_URL}/packages/${p.slug}`,
        lastmod: (p.updatedAt || p.createdAt || today).slice(0, 10),
        changefreq: "weekly",
        priority: p.isFeatured ? "0.9" : "0.8",
        image: p.image ? imageUrl(p.image, 1200) : null,
        imageTitle: p.name,
      })),
    { loc: `${SITE_URL}/ai-planner`, changefreq: "monthly", priority: "0.5" },
    ...legal
      .filter(([, key]) => settings[key])
      .map(([slug]) => ({ loc: `${SITE_URL}/${slug}`, changefreq: "yearly", priority: "0.2" })),
  ];
  write("sitemap.xml", sitemap(entries));
  write("robots.txt", robots());

  console.log(
    `[prerender] ${written} package pages, ${entries.length} sitemap URLs (API: ${API_BASE})`
  );
}

main().catch((err) => {
  // Never break a deploy over SEO extras; app.html is written before anything can fail
  console.warn(`[prerender] skipped: ${err.stack || err.message}`);
});
