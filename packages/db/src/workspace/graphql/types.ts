import * as graphql from "graphql";
import { IResolvers } from "@gnd/graphql-tools";

import { Collections, CollectionName } from "@truffle/db/meta";

export type Definitions<C extends Collections> = {
  [N in CollectionName<C>]: {
    mutable?: boolean;
    typeDefs?: graphql.DocumentNode;
    resolvers?: IResolvers;
  };
};

export type Definition<
  C extends Collections,
  N extends CollectionName<C>
> = Definitions<C>[N];
