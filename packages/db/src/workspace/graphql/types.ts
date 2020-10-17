import * as graphql from "graphql";
import { IResolvers } from "graphql-tools";

import {
  Collections,
  CollectionName,
  MutableCollectionName
} from "@truffle/db/meta";

export type Definitions<C extends Collections> = {
  [N in CollectionName<C>]: N extends MutableCollectionName<C>
    ? {
        mutable: true;
        typeDefs: graphql.DocumentNode;
        resolvers?: IResolvers;
      }
    : {
        mutable?: boolean;
        typeDefs: graphql.DocumentNode;
        resolvers?: IResolvers;
      };
};

export type Definition<
  C extends Collections,
  N extends CollectionName<C>
> = Definitions<C>[N];
