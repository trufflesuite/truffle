import PouchDB from "pouchdb";
import PouchDBDebug from "pouchdb-debug";
import PouchDBFind from "pouchdb-find";
import jsonStableStringify from "json-stable-stringify";
import { soliditySha3 } from "web3-utils";

import {
  AddInput,
  AddPayload,
  CollectionDatabases,
  CollectionName,
  CollectionResult,
  Collections,
  Definition,
  Definitions,
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
export abstract class Databases<C extends Collections> {
  private collections: CollectionDatabases<C>;
  private definitions: Definitions<C>;

  private ready: Promise<void>;

  constructor(options: DatabasesOptions<C>) {
    this.setup(options);

    this.definitions = options.definitions;

    PouchDB.plugin(PouchDBDebug);
    PouchDB.plugin(PouchDBFind);

    this.collections = Object.keys(options.definitions)
      .map((resource: CollectionName<C>) => ({
        [resource]: this.createDatabase(resource)
      }))
      .reduce((a, b) => ({ ...a, ...b }), {}) as CollectionDatabases<C>;

    this.ready = this.initialize();
  }

  protected setup(_) {}

  protected abstract createDatabase(
    resource: CollectionName<C>
  ): PouchDB.Database;

  private async initialize() {
    await Promise.all(
      Object.entries(this.definitions).map(([collectionName, definition]) =>
        this.initializeCollection(collectionName, definition)
      )
    );
  }

  private async initializeCollection<N extends CollectionName<C>>(
    collectionName: N,
    definition: Definition<C, N>
  ) {
    const collection = this.collections[collectionName];

    const { createIndexes } = definition;

    for (let index of createIndexes || []) {
      await collection.createIndex({ index });
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
  ): Promise<Resource<C, N> | null> {
    await this.ready;

    try {
      const result = await this.collections[collectionName].get(id);
      return {
        ...result,
        id
      } as Resource<C, N>;
    } catch (_) {
      return null;
    }
  }

  public async add<N extends CollectionName<C>>(
    collectionName: N,
    input: AddInput<C, N>
  ): Promise<AddPayload<C, N>> {
    await this.ready;

    const { idFields } = this.definitions[collectionName];

    const resources = await Promise.all(
      input[collectionName].map(async (resourceInput: AddInput<C, N>) => {
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
        } as Resource<C, N>;
      })
    );

    return ({
      [collectionName]: resources
    } as unknown) as AddPayload<C, N>;
  }
}
