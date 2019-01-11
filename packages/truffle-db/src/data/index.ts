import fs from "fs";
import path from "path";

import { makeExecutableSchema } from "graphql-tools";

import { resolvers } from "./resolvers";

export function readSchema () {
  const schemaFile = path.join(__dirname, "schema.graphql");
  const typeDefs = fs.readFileSync(schemaFile).toString();

  return makeExecutableSchema({
    typeDefs,
    resolvers,
    resolverValidationOptions: {
      requireResolversForArgs: false  // TODO change to true when ready
    }
  });
}

export const schema = readSchema();
