import PouchDB from "pouchdb";
import PouchDBDebug from "pouchdb-debug";
import PouchDBFind from "pouchdb-find";
import { soliditySha3 } from "web3-utils";
import jsonStableStringify from "json-stable-stringify";

export interface WorkspaceDatabasesOptions<C> {
  settings: any;
  definitions: CollectionDefinitions<C>;
}

export type ResourceMapping<R, C> = {
  [K in CollectionName<C>]: ResourceName<R>;
};

export type MutationMapping<C, M> = {
  [K in CollectionName<C>]: {
    mutation: MutationName<M>;
    input: { [N in K]: any[] };
  };
};

/**
 * Aggegrates logic for interacting wth a set of PouchDB databases identified
 * by resource collection name.
 *
 * Notes on type parameters:
 *   1. R is the schema subset for querying individual resources
 *   2. C is the schema subset for querying collections of resources
 *   3. M is the schema subset for mutations to add resources
 *   4. CR is a type-defined mapping from collection name to resource name
 *   5. CM is a type-defiined mapping from collection name to mutation info
 *
 * As a convention, when present, those type parameters are always specified
 * in that order. For the last two (CR and CM), the convention is that the
 * type maps C to R and C to M, respectively.
 */
export abstract class Databases<
  R,
  C,
  M,
  CR extends ResourceMapping<R, C>,
  CM extends MutationMapping<C, M>
> {
  private collections: CollectionDatabases<C>;
  private definitions: CollectionDefinitions<C>;

  private ready: Promise<void>;

  constructor(options: WorkspaceDatabasesOptions<C>) {
    this.setup(options);

    this.ready = this.initialize();
  }

  protected setup({ definitions }: WorkspaceDatabasesOptions<C>) {
    this.definitions = definitions;

    PouchDB.plugin(PouchDBDebug);
    PouchDB.plugin(PouchDBFind);

    this.collections = Object.keys(definitions)
      .map((resource: CollectionName<C>) => ({
        [resource]: this.createDatabase(resource)
      }))
      .reduce((a, b) => ({ ...a, ...b }), {}) as CollectionDatabases<C>;
  }

  protected abstract createDatabase(
    resource: CollectionName<C>
  ): PouchDB.Database;

  private async initialize() {
    for (const [resource, definition] of Object.entries(this.definitions)) {
      const collection = this.collections[resource as CollectionName<C>];

      const { createIndexes } = definition as CollectionDefinition<C>;

      for (let index of createIndexes || []) {
        await collection.createIndex({ index });
      }
    }
  }

  public async all<N extends CollectionName<C>>(
    collectionName: N
  ): Promise<CollectionResult<C, N>> {
    return await this.find<N>(collectionName, { selector: [] });
  }

  public async find<N extends CollectionName<C>>(
    collectionName: N,
    options: PouchDB.Find.FindRequest<{}>
  ): Promise<CollectionResult<C, N>> {
    await this.ready;

    try {
      const { docs }: any = await this.collections[collectionName].find(
        options
      );

      return docs.map(doc => ({ ...doc, id: doc["_id"] }));
    } catch (error) {
      console.log(`Error fetching all ${collectionName}\n`);
      console.log(error);
      return ([] as unknown) as CollectionResult<C, N>;
    }
  }

  public async get<N extends CollectionName<C>>(
    collectionName: N,
    id: string
  ): Promise<ResourceResult<R, C, CR, N> | null> {
    await this.ready;

    try {
      const result = await this.collections[collectionName].get(id);
      return {
        ...result,
        id
      } as ResourceResult<R, C, CR, N>;
    } catch (_) {
      return null;
    }
  }

  public async add<N extends CollectionName<C>>(
    collectionName: N,
    input: MutationInput<C, M, CM, N>
  ): Promise<MutationResult<R, C, CR, N>> {
    await this.ready;

    const { idFields } = this.definitions[collectionName];

    const resources = await Promise.all(
      input[collectionName].map(
        async (resourceInput: MutationInput<C, M, CM, N>) => {
          const id = soliditySha3(
            jsonStableStringify(
              idFields.reduce(
                (obj, field) => ({
                  ...obj,
                  [field]: resourceInput[field]
                }),
                {}
              )
            )
          );

          // check for existing
          const resource = await this.get(collectionName, id);
          if (resource) {
            return resource;
          }

          const resourceAdded = await this.collections[collectionName].put({
            ...resourceInput,
            _id: id
          });

          return {
            ...resourceInput,
            id
          } as ResourceResult<R, C, CR, N>;
        }
      )
    );

    return {
      [collectionName]: resources
    } as MutationResult<R, C, CR, N>;
  }
}

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
