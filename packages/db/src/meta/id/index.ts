import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:id");

import type {
  Collections,
  CollectionName,
  Resource,
  SavedInput
} from "@truffle/db/meta/collections";
import type { IdObject } from "./types";

export type {
  GenerateId,
  SpecificGenerateId,
  IdObject,
  StrictIdInput
} from "./types";
export type { Definition, Definitions } from "./definitions";
export { forDefinitions } from "./generateId";

export const toIdObject = <
  C extends Collections,
  N extends CollectionName<C>,
  R extends Resource<C, N> | SavedInput<C, N>,
  I extends Pick<R, "id"> | null | undefined = Pick<R, "id"> | null | undefined
>(
  resource: I
): Pick<R, "id"> extends I
  ? IdObject<C, N, R>
  : IdObject<C, N, R> | undefined =>
  // @ts-ignore since this runtime check doesn't seem to play nice with the
  // generic
  resource
    ? ({
        id: resource.id
      } as unknown as IdObject<C, N, R>)
    : undefined;
