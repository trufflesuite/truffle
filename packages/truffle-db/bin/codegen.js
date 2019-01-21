const fs = require("fs");
const path = require("path");
const { generateNamespace } = require("@gql2ts/from-schema");

// for path setup
const { schema } = require("truffle-db/data/schema");

const dataModel = generateNamespace("DataModel", schema, {
  ignoreTypeNameDeclaration: true
});

fs.writeFileSync(path.join(__dirname, "..", "types", "schema.d.ts"), dataModel);
