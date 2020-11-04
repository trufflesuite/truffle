import { logger } from "@truffle/db/logger";
const debug = logger("db:graphql:types");

import * as graphql from "graphql";
import { IResolvers } from "graphql-tools";

import {
  Collections,
  CollectionName,
  MutableCollectionName,
  Workspace
} from "@truffle/db/meta";

export type Definitions<C extends Collections> = {
  [N in CollectionName<C>]: N extends MutableCollectionName<C>
    ? {
        mutable: true;
        typeDefs: graphql.DocumentNode;
        resolvers?: IResolvers<any, Context<C>>;
      }
    : {
        mutable?: boolean;
        typeDefs: graphql.DocumentNode;
        resolvers?: IResolvers<any, Context<C>>;
      };
};

export interface Context<C extends Collections> {
  workspace: Workspace<C>;
}

export type Definition<
  C extends Collections,
  N extends CollectionName<C>
> = Definitions<C>[N];
