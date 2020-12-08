import { logger } from "./logger";
const debug = logger("db:server");

const { ApolloServer } = require("apollo-server");
import type TruffleConfig from "@truffle/config";

import { schema } from "@truffle/db/schema";
import { attach } from "@truffle/db/workspace";

export const serve = (config: TruffleConfig) => {
  const workspace = attach({
    workingDirectory: config.working_directory,
    adapter: (config.db || {}).adapter
  });

  return new ApolloServer({
    tracing: true,
    schema,
    context: { workspace }
  });
};
