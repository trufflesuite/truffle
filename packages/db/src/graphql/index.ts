import { logger } from "@truffle/db/logger";
const debug = logger("db:graphql");

import { makeExecutableSchema } from "graphql-tools";

export * from "./types";

import { Collections } from "@truffle/db/meta";
import { DefinitionsSchema } from "./schema";
import { Definitions } from "./types";

export const forDefinitions = <C extends Collections>(
  definitions: Definitions<C>
) => {
  const { typeDefs, resolvers } = new DefinitionsSchema({ definitions });
  return makeExecutableSchema({ typeDefs, resolvers });
};
