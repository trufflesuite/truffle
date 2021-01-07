import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:definitions");

import { Collections, CollectionName } from "./collections";
import * as GraphQl from "./graphql";

export type Definitions<C extends Collections> = {
  [N in CollectionName<C>]: GraphQl.Definition<C, N>;
};

export type Definition<
  C extends Collections,
  N extends CollectionName<C>
> = Definitions<C>[N];
