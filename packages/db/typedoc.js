const useNeo = false;

const common = {
  entryPoints: ["src/index.ts"],
  categoryOrder: [
    "Primary",
    "Schema Root",
    "Resource",
    "Resource Input",
    "Constructor",
    "Truffle-specific",
    "Definitions",
    "Other",
    "Internal"
  ],
  readme: "none",
  includes: "dist",
  media: "docs",
  out: "dist/docs"
};

const plugins = [];

// for typedoc-neo-theme
const neo = {
  theme: "../../node_modules/typedoc-neo-theme/bin/default",
  plugin: [...plugins, "typedoc-neo-theme"],
  outline: [
    {
      "Core namespaces": {
        DataModel: "datamodel",
        Resources: "resources",
        GraphQl: "graphql",
        Process: "process",
        Batch: "batch"
      },
      "Truffle integration": {
        "Class: Project": "classes/project",
        "Class: Project.ConnectedProject": "classes/project.connectedproject"
      },
      "Meta system": {
        "Meta": "meta",
        "Meta.Pouch": "meta.pouch",
        "Meta.GraphQl": "meta.graphql",
        "Meta.Process": "meta.process",
        "Meta.Batch": "meta.batch"
      }
    }
  ]
};

module.exports = {
  ...common,
  plugin: plugins.length > 0 ? plugins : ["none"],
  ...(useNeo ? neo : {})
};
