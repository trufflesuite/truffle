import { logger } from "@truffle/db/logger";
const debug = logger("db:schema");

import { forDefinitions } from "@truffle/db/graphql";
import * as GraphQl from "@truffle/db/graphql";
import { Collections, definitions } from "@truffle/db/resources";

export type Context = GraphQl.Context<Collections>;

export const schema = forDefinitions(definitions);
