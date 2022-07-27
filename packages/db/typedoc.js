module.exports = {
  entryPoints: ["src/index.ts"],
  categorizeByGroup: false,
  categoryOrder: [
    "Primary",
    "Schema Root",
    "Resource",
    "Resource Input",
    "Constructor",
    "Abstraction",
    "Truffle-specific",
    "Definitions",
    "Other",
    "Internal processor",
    "Internal boilerplate",
    "Internal"
  ],
  includes: "dist",
  media: "docs",
  out: "dist/docs",
  plugin: [],
  readme: "none",
  validation: {
    notExported: false
  }
};
