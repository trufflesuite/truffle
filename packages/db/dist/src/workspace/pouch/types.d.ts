/// <reference types="pouchdb-find" />
/// <reference types="pouchdb-core" />
/// <reference types="pouchdb-mapreduce" />
/// <reference types="pouchdb-replication" />
export declare type Collections = {
  [collectionName: string]: {
    resource: any;
    input: any;
    mutable?: boolean;
  };
};
export declare type Definitions<C extends Collections> = {
  [N in CollectionName<C>]: {
    createIndexes: PouchDB.Find.CreateIndexOptions["index"][];
    idFields: string[];
  };
};
export declare type CollectionDatabases<C extends Collections> = {
  [N in CollectionName<C>]: PouchDB.Database;
};
export declare type CollectionName<C extends Collections> = string & keyof C;
export declare type CollectionResult<
  C extends Collections,
  N extends CollectionName<C>
> = Resource<C, N>[];
export declare type Resource<
  C extends Collections,
  N extends CollectionName<C>
> = C[N]["resource"];
export declare type Input<
  C extends Collections,
  N extends CollectionName<C>
> = C[N]["input"];
export declare type Payload<
  C extends Collections,
  N extends CollectionName<C>
> = {
  [K in N]: Resource<C, N>[];
};
export declare type Definition<
  C extends Collections,
  N extends CollectionName<C>
> = Definitions<C>[N];
export declare type MutableCollectionName<C extends Collections> = {
  [K in CollectionName<C>]: C[K]["mutable"] extends true ? K : never;
}[CollectionName<C>];
