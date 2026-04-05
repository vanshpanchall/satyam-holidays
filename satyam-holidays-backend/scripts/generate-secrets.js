const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function randomBase64Url(lengthBytes) {
  return crypto.randomBytes(lengthBytes).toString("base64url");
}

function randomPassword(length = 24) {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+";
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += charset[bytes[i] % charset.length];
  }
  return out;
}

function upsertEnv(content, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) return content.replace(pattern, line);
  return `${content.trim()}\n${line}\n`;
}

function parseArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : "";
}

function main() {
  const jwtSecret = randomBase64Url(48); // ~64 chars
  const adminPassword = randomPassword(22);
  const csrfSeed = randomBase64Url(32);

  console.log("Generated production secrets:\n");
  console.log(`JWT_SECRET=${jwtSecret}`);
  console.log(`ADMIN_PASSWORD=${adminPassword}`);
  console.log(`CSRF_SECRET_SEED=${csrfSeed}`);
  console.log("\nStore these in your production secret manager immediately.");

  const envFile = parseArg("env-file");
  if (!envFile) return;

  const resolvedPath = path.resolve(process.cwd(), envFile);
  const existing = fs.existsSync(resolvedPath) ? fs.readFileSync(resolvedPath, "utf8") : "";

  let updated = existing;
  updated = upsertEnv(updated, "JWT_SECRET", jwtSecret);
  updated = upsertEnv(updated, "ADMIN_PASSWORD", adminPassword);

  fs.writeFileSync(resolvedPath, updated, "utf8");
  console.log(`\nUpdated ${resolvedPath} with JWT_SECRET and ADMIN_PASSWORD.`);
}

main();
