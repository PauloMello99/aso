/** Unit tests: use-cases/domain com fakes (specs dentro de src). */
/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/src/**/*.spec.ts", "<rootDir>/src/**/*.spec.tsx"],
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  clearMocks: true,
  setupFiles: ["reflect-metadata"],
};
