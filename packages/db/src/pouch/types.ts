import PouchDB from "pouchdb";

import {
  CollectionName,
  Collections,
  MutationInput,
  MutationPayload,
  MutableCollectionName,
  SavedInput
} from "@truffle/db/meta";

export type Definitions<C extends Collections> = {
  [N in CollectionName<C>]: {
    createIndexes: PouchDB.Find.CreateIndexOptions["index"][];
    idFields: string[];
  };
};

export type Definition<
  C extends Collections,
  N extends CollectionName<C>
> = Definitions<C>[N];

export interface Workspace<C extends Collections> {
  all<N extends CollectionName<C>>(
    collectionName: N
  ): Promise<SavedInput<C, N>[]>;

  find<N extends CollectionName<C>>(
    collectionName: N,
    options: PouchDB.Find.FindRequest<{}>
  ): Promise<SavedInput<C, N>[]>;

  get<N extends CollectionName<C>>(
    collectionName: N,
    id: string
  ): Promise<Historical<SavedInput<C, N>> | null>;

  add<N extends CollectionName<C>>(
    collectionName: N,
    input: MutationInput<C, N>
  ): Promise<MutationPayload<C, N>>;

  update<M extends MutableCollectionName<C>>(
    collectionName: M,
    input: MutationInput<C, M>
  ): Promise<MutationPayload<C, M>>;

  remove<M extends MutableCollectionName<C>>(
    collectionName: M,
    input: MutationInput<C, M>
  ): Promise<void>;
}

export type History = PouchDB.Core.IdMeta & PouchDB.Core.GetMeta;

export type Historical<T> = {
  [K in keyof T | keyof History]: K extends keyof History
    ? History[K]
    : K extends keyof T
    ? T[K]
    : never;
};
