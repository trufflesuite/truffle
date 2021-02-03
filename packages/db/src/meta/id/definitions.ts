import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:id:definitions");

import type {
  Collections,
  CollectionName,
  IdFields
} from "@truffle/db/meta/collections";

/**
 * @category Definitions
 */
export type Definitions<C extends Collections> = {
  [N in CollectionName<C>]: Definition<C, N>;
};

/**
 * @category Definitions
 */
export type Definition<C extends Collections, N extends CollectionName<C>> = {
  idFields: IdFields<C, N>;
};
