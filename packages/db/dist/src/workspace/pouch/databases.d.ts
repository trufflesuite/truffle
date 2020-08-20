/// <reference types="pouchdb-find" />
/// <reference types="pouchdb-core" />
/// <reference types="pouchdb-mapreduce" />
/// <reference types="pouchdb-replication" />
import {
  CollectionName,
  CollectionResult,
  Collections,
  Definitions,
  Input,
  Payload,
  MutableCollectionName,
  Resource
} from "./types";
export interface DatabasesOptions<C extends Collections> {
  settings: any;
  definitions: Definitions<C>;
}
/**
 * Aggegrates logic for interacting wth a set of PouchDB databases identified
 * by resource collection name.
 */
export declare abstract class Databases<C extends Collections> {
  private collections;
  private definitions;
  private ready;
  constructor(options: DatabasesOptions<C>);
  protected setup(_: any): void;
  protected abstract createDatabase(
    resource: CollectionName<C>
  ): PouchDB.Database;
  private initialize;
  private initializeCollection;
  all<N extends CollectionName<C>>(
    collectionName: N
  ): Promise<CollectionResult<C, N>>;
  find<N extends CollectionName<C>>(
    collectionName: N,
    options: PouchDB.Find.FindRequest<{}>
  ): Promise<CollectionResult<C, N>>;
  get<N extends CollectionName<C>>(
    collectionName: N,
    id: string
  ): Promise<Resource<C, N> | null>;
  add<N extends CollectionName<C>>(
    collectionName: N,
    input: Input<C, N>
  ): Promise<Payload<C, N>>;
  update<M extends MutableCollectionName<C>>(
    collectionName: M,
    input: Input<C, M>
  ): Promise<Payload<C, M>>;
  remove<M extends MutableCollectionName<C>>(
    collectionName: M,
    input: Input<C, M>
  ): Promise<void>;
  private generateId;
}
