module.exports = {
  moduleFileExtensions: ["ts", "js", "json", "node"],
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
  globals: {
    "ts-jest": {
      tsConfig: "<rootDir>/tsconfig.server.json",
      diagnostics: true
    }
  },
  testMatch: [
    // match files in test/ directories (exclude root `./test/`)
    "<rootDir>/@(lib|test)/**/test/*.@(ts|js)",

    // or files that use a test extension prefix
    "<rootDir>/@(lib|test)/**/*.@(test|spec).@(ts|js)"
  ]
};
