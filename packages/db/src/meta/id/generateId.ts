import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:id:generateId");

import type {
  Collections,
  CollectionName,
  Input
} from "@truffle/db/meta/collections";

import type { GenerateId } from "./types";
import type { Definitions } from "./definitions";
import { hash } from "./hash";

export const forDefinitions = <C extends Collections>(
  definitions: Definitions<C>
): GenerateId<C> => <N extends CollectionName<C>>(
  collectionName: N,
  input: Input<C, N>
) => {
  const { idFields } = definitions[collectionName];

  const plucked = idFields.reduce(
    (obj, field) => ({ ...obj, [field]: input[field] }),
    {}
  );

  return hash(plucked);
};
