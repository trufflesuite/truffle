const fs = require("fs");
const path = require("path");
const { generateNamespace } = require("@gql2ts/from-schema");

const {
  GraphQl: { schema }
} = require("@truffle/db");

const dataModel = generateNamespace(
  "_DataModel",
  schema,
  {
    ignoreTypeNameDeclaration: true,
    ignoredTypes: ["Resource", "Named", "Entry"]
  },
  {
    generateInterfaceName: name => name
  }
);

fs.writeFileSync(path.join(__dirname, "..", "types", "schema.d.ts"), dataModel);
