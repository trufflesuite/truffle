/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transformIgnorePatterns: [
    "/node_modules/",
    "./src/test/solver.spec.ts$",
    "./src/test/runner.spec.ts$"
  ],
  testPathIgnorePatterns: ["<rootDir>/src/", "<rootDir>/node_modules/"],
  modulePaths: ["<rootDir>/src"]
};
