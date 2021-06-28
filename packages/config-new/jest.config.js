module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["./test/matchers.ts"],
  moduleNameMapper: {
    "^@truffle/config-new/(.*)": "<rootDir>/src/$1",
    "^@truffle/config-new": "<rootDir>/src",
    "^test/(.*)": "<rootDir>/test/$1"
  },
  testMatch: [
    "<rootDir>/src/**/test/*.(ts|js)",
    "<rootDir>/test/**/test/*.(ts|js)",
    "<rootDir>/src/**/*\\.(spec|test)\\.(ts|js)",
    "<rootDir>/test/**/*\\.(spec|test)\\.(ts|js)"
  ]
};
