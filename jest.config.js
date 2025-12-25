// jest.config.js
export default {
  testEnvironment: "node",
  transform: {}, // required for ES modules
  roots: ["<rootDir>/tests"],
  setupFilesAfterEnv: ["<rootDir>/tests/setupTests.js"],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
};
