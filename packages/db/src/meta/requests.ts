import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:requests");

import {
  Collections,
  CollectionName,
  CollectionProperty,
  Resource,
  MutationPayload
} from "./collections";

export type QueryName<
  C extends Collections,
  N extends CollectionName<C> = CollectionName<C>
> = {
  [K in N]:
    | CollectionProperty<"names", C, K>["resource"]
    | CollectionProperty<"names", C, K>["resources"];
}[N];

export type Query<C extends Collections> = {
  [N in CollectionName<C>]: {
    [Q in QueryName<C, N>]: Q extends CollectionProperty<
      "names",
      C,
      N
    >["resource"]
      ? Resource<C, N> | null
      : Q extends CollectionProperty<"names", C, N>["resources"]
      ? (Resource<C, N> | null)[] | null
      : never;
  };
}[CollectionName<C>];

export type MutationName<
  C extends Collections,
  N extends CollectionName<C> = CollectionName<C>
> = {
  [K in N]: CollectionProperty<"names", C, K>["resourcesMutate"];
}[N];

export type Mutation<C extends Collections> = {
  [N in CollectionName<C>]: {
    [M in MutationName<C, N>]: MutationPayload<C, N> | null;
  };
}[CollectionName<C>];
