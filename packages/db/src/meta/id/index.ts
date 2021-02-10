import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:id");

import type {
  Collections,
  CollectionName,
  Resource
} from "@truffle/db/meta/collections";
import type { IdObject } from "./types";

export {
  GenerateId,
  SpecificGenerateId,
  IdObject,
  StrictIdInput
} from "./types";
export { Definition, Definitions } from "./definitions";
export { forDefinitions } from "./generateId";

export const toIdObject = <C extends Collections, N extends CollectionName<C>>({
  id
}: Resource<C, N>): IdObject<C, N> =>
  ({
    id
  } as IdObject<C, N>);
