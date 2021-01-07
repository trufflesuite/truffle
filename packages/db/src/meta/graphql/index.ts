import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:graphql");

export { Definition, Definitions, Context } from "./types";
export { forDefinitions } from "./schema";
