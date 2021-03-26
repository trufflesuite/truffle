const { requestPromise } = require('jest-transform-stealthy-require/dist/presets');

module.exports = {
  testMatch: ["**/test/**/*.test.[jt]s"],
  testEnvironment: "node",
  transform: {
    ...requestPromise.transform
  },
  transformIgnorePatterns: [requestPromise.transformIgnorePattern],
  preset: "ts-jest"
};
