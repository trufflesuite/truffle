const fs = require("fs");
const path = require("path");
const { generateNamespace } = require("@gql2ts/from-schema");

const { schema } = require("@truffle/db/dist/src/schema");

const dataModel = generateNamespace(
  "DataModel",
  schema,
  {
    ignoreTypeNameDeclaration: true,
    ignoredTypes: ["Resource", "Named"]
  },
  {
    generateInterfaceName: name => name
  }
);

fs.writeFileSync(path.join(__dirname, "..", "types", "schema.d.ts"), dataModel);
