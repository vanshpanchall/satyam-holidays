import React from "react";
import { Link } from "react-router-dom";
import SiteLayout from "../components/SiteLayout";
import Meta from "../components/Meta";
import { useSetting, useSiteConfig } from "../contexts/SettingsContext";

export const LEGAL_PAGES = {
  "privacy-policy": { key: "legal.privacy", title: "Privacy policy" },
  terms: { key: "legal.terms", title: "Terms & conditions" },
  "refund-policy": { key: "legal.refund", title: "Cancellation & refunds" },
};

// Admin-edited plain text: "## " starts a heading, blank lines separate paragraphs
const renderBlocks = (text) =>
  String(text || "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .flatMap((block, i) => {
      const lines = block.split("\n");
      if (lines[0].startsWith("## ")) {
        const rest = lines.slice(1).join(" ").trim();
        return [
          <h2 key={`h${i}`}>{lines[0].slice(3)}</h2>,
          rest && <p key={`p${i}`}>{rest}</p>,
        ].filter(Boolean);
      }
      return [<p key={`p${i}`}>{lines.join(" ")}</p>];
    });

const LegalPage = ({ page }) => {
  const config = LEGAL_PAGES[page];
  const content = useSetting(config.key);
  const { company } = useSiteConfig();

  return (
    <SiteLayout>
      <Meta
        title={`${config.title} | ${company.name}`}
        description={`${config.title} for ${company.name}.`}
      />
      <div className="container-site grid gap-12 py-12 md:py-20 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <nav
            aria-label="Policies"
            className="lg:sticky"
            style={{ top: "calc(var(--header-h) + 2rem)" }}
          >
            <p className="eyebrow mb-4">Policies</p>
            <ul className="space-y-2">
              {Object.entries(LEGAL_PAGES).map(([slug, p]) => (
                <li key={slug}>
                  <Link
                    to={`/${slug}`}
                    aria-current={slug === page ? "page" : undefined}
                    className={slug === page ? "text-fg" : "text-muted hover:text-fg"}
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <article className="max-w-2xl lg:col-span-8">
          <h1 className="font-display text-display-md font-light text-fg">{config.title}</h1>
          <div className="prose-site mt-10">{renderBlocks(content)}</div>
          <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
            Questions? Write to{" "}
            <a href={`mailto:${company.email}`} className="text-fg underline underline-offset-4">
              {company.email}
            </a>
            .
          </p>
        </article>
      </div>
    </SiteLayout>
  );
};

export default LegalPage;
