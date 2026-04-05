const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const LIGHTHOUSE_URL = "http://127.0.0.1:4173";
const OUTPUT_DIR = path.resolve(".lighthouseci");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "manual-performance.json");
const CHROME_PROFILE_DIR = path.join(OUTPUT_DIR, `chrome-profile-${Date.now()}`);

const THRESHOLDS = [
  { id: "first-contentful-paint", label: "FCP", max: 2000 },
  { id: "interactive", label: "TTI", max: 4000 },
  { id: "total-blocking-time", label: "TBT", max: 300 },
  { id: "cumulative-layout-shift", label: "CLS", max: 0.1 },
  { id: "largest-contentful-paint", label: "LCP", max: 2500 },
];

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function formatValue(id, value) {
  if (id === "cumulative-layout-shift") {
    return value.toFixed(3);
  }
  return `${Math.round(value)}ms`;
}

function formatLimit(id, limit) {
  if (id === "cumulative-layout-shift") {
    return limit.toFixed(1);
  }
  return `${limit}ms`;
}

function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  if (!fs.existsSync(CHROME_PROFILE_DIR)) {
    fs.mkdirSync(CHROME_PROFILE_DIR, { recursive: true });
  }

  const npxCommand = "npx";
  const lighthouseArgs = [
    "--yes",
    "lighthouse@12.1.0",
    LIGHTHOUSE_URL,
    "--only-categories=performance",
    "--output=json",
    `--output-path=${OUTPUT_FILE}`,
    `--chrome-flags=--headless --disable-gpu --no-sandbox --user-data-dir=${CHROME_PROFILE_DIR}`,
    "--quiet",
  ];

  runCommand(npxCommand, lighthouseArgs);

  const report = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
  const audits = report.audits || {};

  let hasFailure = false;
  console.log("\nLighthouse Performance Gate Results");

  for (const threshold of THRESHOLDS) {
    const audit = audits[threshold.id];

    if (!audit || typeof audit.numericValue !== "number") {
      hasFailure = true;
      const reason =
        audit?.errorMessage || `Missing numeric value (${audit?.scoreDisplayMode || "unknown"})`;
      console.log(`- FAIL ${threshold.label}: ${reason}`);
      continue;
    }

    const passed = audit.numericValue <= threshold.max;
    if (!passed) {
      hasFailure = true;
    }

    const status = passed ? "PASS" : "FAIL";
    console.log(
      `- ${status} ${threshold.label}: ${formatValue(threshold.id, audit.numericValue)} (limit ${formatLimit(threshold.id, threshold.max)})`
    );
  }

  if (hasFailure) {
    console.error("\nPerformance gate failed. Optimize metrics before production deployment.");
    process.exit(1);
  }

  console.log("\nPerformance gate passed.");
}

main();
