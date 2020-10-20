import * as graphql from "graphql";
import { IResolvers } from "graphql-tools";

import {
  Collections,
  CollectionName,
  MutableCollectionName
} from "@truffle/db/meta";

import { Workspace } from "../pouch";

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

  // HACK this is a bit out of place here
  workingDirectory: string;
}

export type Definition<
  C extends Collections,
  N extends CollectionName<C>
> = Definitions<C>[N];
