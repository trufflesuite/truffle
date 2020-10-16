const fs = require("fs");
const path = require("path");
const { generateNamespace } = require("@gql2ts/from-schema");

// for path setup
require("@truffle/db");

const { schema } = require("@truffle/db/workspace/schema");

const dataModel = generateNamespace("DataModel", schema, {
  ignoreTypeNameDeclaration: true
});

fs.writeFileSync(path.join(__dirname, "..", "types", "schema.d.ts"), dataModel);
