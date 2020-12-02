import { logger } from "@truffle/db/logger";
const debug = logger("db:schema");

import * as GraphQl from "./graphql";
import { Collections, definitions } from "./resources";

export type Context = GraphQl.Context<Collections>;

export const schema = GraphQl.forDefinitions(definitions);
