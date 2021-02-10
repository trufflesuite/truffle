import { logger } from "@truffle/db/logger";
const debug = logger("db:graphql:types");

import type * as graphql from "graphql";
import type { IResolvers } from "graphql-tools";

import type {
  Collections,
  CollectionName,
  CollectionNameStyle,
  CollectionNameStyledAs,
  MutableCollectionName
} from "@truffle/db/meta/collections";
import * as Id from "@truffle/db/meta/id";
import type { Workspace } from "@truffle/db/meta/data";

/**
 * @category Definitions
 */
export type Definitions<C extends Collections> = {
  [N in CollectionName<C>]: Definition<C, N>;
};

/**
 * @category Definitions
 */
export type Definition<
  C extends Collections,
  N extends CollectionName<C>
> = Id.Definition<C, N> & {
  typeDefs: graphql.DocumentNode;
  resolvers?: IResolvers<any, Context<C>>;
  names: {
    [S in CollectionNameStyle]: CollectionNameStyledAs<S, C, N>;
  };
} & (N extends MutableCollectionName<C>
    ? { mutable: true }
    : { mutable?: false });

export interface Context<C extends Collections> {
  workspace: Workspace<C>;
}
