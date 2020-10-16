import * as fse from "fs-extra";
import path from "path";

export function readSchema() {
  const schemaFile = path.join(__dirname, "schema.graphql");
  const typeDefs = fse.readFileSync(schemaFile).toString();
  return typeDefs;
}

export const schema = readSchema();
