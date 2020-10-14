import PouchDB from "pouchdb";

export type Collections = {
  [collectionName: string]: {
    resource: any;
    input: any;
    mutable?: boolean;
    named?: boolean;
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

export type NamedCollectionName<C extends Collections> = CollectionName<
  C,
  { is: "named" }
>;

export type Collection<
  C extends Collections = Collections,
  N extends CollectionName<C> = CollectionName<C>
> = {
  [K in N]: C[K];
}[N];

export type CollectionPropertyFilter = {
  extends: any;
};

export type CollectionPropertyName<
  F extends CollectionPropertyFilter = CollectionPropertyFilter
> = {
  [P in string &
    keyof Collection<Collections>]: F["extends"] extends CollectionProperty<
    P,
    Collections
  >
    ? P
    : never;
}[string & keyof Collection<Collections>];

export type CollectionProperty<
  P extends CollectionPropertyName,
  C extends Collections = Collections,
  N extends CollectionName<C> = CollectionName<C>
> = Collection<C, N>[P];

export type CollectionResult<
  C extends Collections,
  N extends CollectionName<C>
> = Resource<C, N>[];

export type ResourceFilter = {
  is: CollectionPropertyName<{ extends: boolean }>;
};

export type Resource<
  C extends Collections = Collections,
  N extends CollectionName<C> = CollectionName<C>,
  F = undefined
> = F extends ResourceFilter
  ? Extract<Collection<C, N>, { [K in F["is"]]: true }> extends never
    ? never
    : Extract<Collection<C, N>, { [K in F["is"]]: true }>["resource"]
  : CollectionProperty<"resource", C, N>;

export type FilteredCollectionName<C extends Collections, F = undefined> = {
  [K in CollectionName<C>]: Resource<C, K, F> extends never ? never : K;
}[CollectionName<C>];

export type MutableResource<
  C extends Collections,
  N extends CollectionName<C> = CollectionName<C>
> = Resource<C, N, { is: "mutable" }>;

export type MutableCollectionName<
  C extends Collections
> = FilteredCollectionName<C, { is: "mutable" }>;

export type NamedResource<
  C extends Collections,
  N extends NamedCollectionName<C> = NamedCollectionName<C>
> = Resource<C, N>;

export type Input<
  C extends Collections,
  N extends CollectionName<C>
> = CollectionProperty<"input", C, N>;

export type Payload<C extends Collections, N extends CollectionName<C>> = {
  [K in N]: Resource<C, N>[];
};

export type Definition<
  C extends Collections,
  N extends CollectionName<C>
> = Definitions<C>[N];
