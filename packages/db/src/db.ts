import { logger } from "@truffle/db/logger";
const debug = logger("db:db");

import { Db, forDefinitions } from "./meta";
export { Db }; // rather than force src/index from touching meta

import { definitions } from "./resources";

export const { connect } = forDefinitions(definitions);
