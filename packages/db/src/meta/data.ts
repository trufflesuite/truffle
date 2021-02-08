import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:data");

import PouchDB from "pouchdb";

import type {
  Collections,
  CollectionName,
  MutableCollectionName,
  MutationInput,
  MutationPayload,
  SavedInput
} from "./collections";
import type { IdObject } from "./id";

export interface Workspace<C extends Collections> {
  all<N extends CollectionName<C>>(
    collectionName: N
  ): Promise<SavedInput<C, N>[]>;

  find<N extends CollectionName<C>>(
    collectionName: N,
    options: (IdObject<C, N> | undefined)[] | PouchDB.Find.FindRequest<{}>
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
