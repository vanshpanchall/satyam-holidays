/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js"],
  globalSetup: "./jest.globalSetup.js",
  globalTeardown: "./jest.globalTeardown.js",
  setupFiles: ["./jest.setupEnv.js"],
  verbose: false,
};
