const logger = require("./logger");

// The public site pre-renders package pages and sitemap.xml at build time. When content
// changes, ask Vercel to rebuild the frontend (FRONTEND_DEPLOY_HOOK_URL = a Deploy Hook URL
// from the frontend project's Settings → Git). Throttled so a burst of edits causes one build.
const MIN_INTERVAL_MS = 2 * 60 * 1000;
let lastTriggeredAt = 0;

function triggerFrontendRebuild(reason) {
  const url = process.env.FRONTEND_DEPLOY_HOOK_URL;
  if (!url || process.env.NODE_ENV === "test") return false;

  const now = Date.now();
  if (now - lastTriggeredAt < MIN_INTERVAL_MS) return false;
  lastTriggeredAt = now;

  // Fire-and-forget: never make an admin save wait on Vercel
  fetch(url, { method: "POST" })
    .then((res) =>
      logger.info("[deployHook] frontend rebuild requested", { reason, status: res.status })
    )
    .catch((err) => logger.warn("[deployHook] request failed", { reason, error: err.message }));
  return true;
}

module.exports = { triggerFrontendRebuild };
