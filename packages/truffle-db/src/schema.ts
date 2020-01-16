import fs from "fs";
import path from "path";

import { makeExecutableSchema } from "@gnd/graphql-tools";

export function readSchema() {
  const schemaFile = path.join(__dirname, "schema.graphql");
  const typeDefs = fs.readFileSync(schemaFile).toString();

  return makeExecutableSchema({
    typeDefs,
    resolvers: {
      Named: {
        __resolveType: obj => {
          if (obj.networkId) {
            return "Network";
          } else {
            return "Contract";
          }
        }
      }
    }
  });
}

export const schema = readSchema();
