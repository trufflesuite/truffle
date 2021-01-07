import { logger } from "@truffle/db/logger";
const debug = logger("db:meta");

export * from "./ids";
export * from "./requests";
export * from "./collections";
export * from "./requests";
export * from "./interface";
export * from "./data";
export * as GraphQl from "./graphql";
export * as Pouch from "./pouch";
export * from "./definitions";

import { Collections } from "./collections";
import { Definitions } from "./definitions";
import * as GraphQl from "./graphql";
import * as Pouch from "./pouch";

export const forDefinitions = <C extends Collections>(
  definitions: Definitions<C>
) => ({
  schema: GraphQl.forDefinitions(definitions),
  attach: Pouch.forDefinitions(definitions)
});
