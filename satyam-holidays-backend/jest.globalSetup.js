const { MongoMemoryServer } = require("mongodb-memory-server");
const path = require("path");
const fs = require("fs");

module.exports = async function globalSetup() {
  const mongod = new MongoMemoryServer();
  await mongod.start();

  const uri = mongod.getUri();

  // Write the URI to a temp file so test workers can read it
  // (globalSetup runs in a separate process from test workers)
  const configPath = path.join(__dirname, ".test-mongo-uri");
  fs.writeFileSync(configPath, uri);

  // Store the instance so globalTeardown can stop it
  globalThis.__MONGOD__ = mongod;
};
