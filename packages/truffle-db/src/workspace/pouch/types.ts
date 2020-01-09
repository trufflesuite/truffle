import PouchDB from "pouchdb";

export type ResourceMapping<R, C> = {
  [K in CollectionName<C>]: ResourceName<R>;
};

export type MutationMapping<C, M> = {
  [K in CollectionName<C>]: {
    mutation: MutationName<M>;
    input: { [N in K]: any[] };
  };
};

type CollectionDatabases<C> = {
  [name in CollectionName<C>]: PouchDB.Database;
};

type CollectionDefinition<C> = {
  createIndexes: PouchDB.Find.CreateIndexOptions["index"][];
  idFields: string[];
};

type CollectionDefinitions<C> = {
  [name in CollectionName<C>]: CollectionDefinition<C>;
};

type CollectionName<C> = string & keyof C;
type ResourceName<R> = string & keyof R;
type MutationName<M> = string & keyof M;

type CollectionResult<C, N extends CollectionName<C>> = C[N];

// if N is "contracts", CR[N] is "contract", R["contract"] is DataModel.IContract
type ResourceResult<
  R,
  C,
  CR extends ResourceMapping<R, C>,
  N extends CollectionName<C>
> = R[CR[N]];

type MutationInput<
  C,
  M,
  CM extends MutationMapping<C, M>,
  N extends CollectionName<C>
> = CM[N]["input"];

type MutationResult<
  R,
  C,
  CR extends ResourceMapping<R, C>,
  N extends CollectionName<C>
> = { [K in N]: ResourceResult<R, C, CR, N>[] };
