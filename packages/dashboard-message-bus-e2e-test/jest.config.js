module.exports = {
  moduleFileExtensions: ["js", "json", "node", "ts"],
  testEnvironment: "node",
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.json",
        diagnostics: true
      }
    ]
  },
  testMatch: [
    "<rootDir>/@(lib|test)/**/*.@(test|spec).@(ts|js)",
    "<rootDir>/@(lib|test)/**/test/*.@(ts|js)"
  ],
  preset: "ts-jest"
};
