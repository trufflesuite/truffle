import PouchDB from "pouchdb";

export type Collections = {
  [collectionName: string]: {
    resource: any;
    input: any;
    mutable?: boolean;
  };
};

export type Definitions<C extends Collections> = {
  [N in CollectionName<C>]: {
    createIndexes: PouchDB.Find.CreateIndexOptions["index"][];
    idFields: string[];
  };
};

export type CollectionDatabases<C extends Collections> = {
  [N in CollectionName<C>]: PouchDB.Database;
};

export type CollectionName<C extends Collections> = string & keyof C;

export type CollectionResult<
  C extends Collections,
  N extends CollectionName<C>
> = Resource<C, N>[];

export type Resource<
  C extends Collections,
  N extends CollectionName<C>
> = C[N]["resource"];

export type Input<
  C extends Collections,
  N extends CollectionName<C>
> = C[N]["input"];

export type Payload<C extends Collections, N extends CollectionName<C>> = {
  [K in N]: Resource<C, N>[];
};

export type Definition<
  C extends Collections,
  N extends CollectionName<C>
> = Definitions<C>[N];

export type MutableCollectionName<C extends Collections> = {
  [K in CollectionName<C>]: C[K]["mutable"] extends true ? K : never;
}[CollectionName<C>];
