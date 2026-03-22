const path = require("path");
const fs = require("fs");

module.exports = async function globalTeardown() {
  if (globalThis.__MONGOD__) {
    await globalThis.__MONGOD__.stop();
  }

  // Clean up the temp URI file
  const configPath = path.join(__dirname, ".test-mongo-uri");
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }
};
