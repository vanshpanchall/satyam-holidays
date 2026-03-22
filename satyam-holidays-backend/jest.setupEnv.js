// This file runs in each test worker before tests execute.
// It reads the MongoDB URI written by globalSetup and sets it as an env var.
const path = require("path");
const fs = require("fs");

const configPath = path.join(__dirname, ".test-mongo-uri");
if (fs.existsSync(configPath)) {
  process.env.MONGODB_URI = fs.readFileSync(configPath, "utf8").trim();
}
