import * as graphql from "graphql";
import { IResolvers } from "graphql-tools";

import {
  Collections,
  CollectionName,
  MutableCollectionName
} from "@truffle/db/meta";

import { Databases } from "../pouch";

export type Definitions<C extends Collections> = {
  [N in CollectionName<C>]: N extends MutableCollectionName<C>
    ? {
        mutable: true;
        typeDefs: graphql.DocumentNode;
        resolvers?: IResolvers<any, { workspace: Databases<C> }>;
      }
    : {
        mutable?: boolean;
        typeDefs: graphql.DocumentNode;
        resolvers?: IResolvers<any, { workspace: Databases<C> }>;
      };
};

export type Definition<
  C extends Collections,
  N extends CollectionName<C>
> = Definitions<C>[N];
