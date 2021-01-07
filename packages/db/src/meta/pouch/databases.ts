import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:pouch:databases");

import PouchDB from "pouchdb";
import PouchDBDebug from "pouchdb-debug";
import PouchDBFind from "pouchdb-find";

import {
  CollectionName,
  Collections,
  MutationInput,
  MutationPayload,
  MutableCollectionName
} from "@truffle/db/meta/collections";
import { generateId } from "@truffle/db/meta/ids";
import { Workspace, SavedInput, Historical } from "@truffle/db/meta/data";

import { Definition, Definitions } from "./types";

export interface DatabasesOptions<C extends Collections> {
  settings: any;
  definitions: Definitions<C>;
}

/**
 * Aggegrates logic for interacting wth a set of PouchDB databases identified
 * by resource collection name.
 */
export abstract class Databases<C extends Collections> implements Workspace<C> {
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
    for (const [collectionName, definition] of Object.entries(
      this.definitions
    )) {
      await this.initializeCollection(collectionName, definition);
    }

    debug("Databases ready.");
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
  ): Promise<SavedInput<C, N>[]> {
    await this.ready;

    const log = debug.extend(`${collectionName}:all`);
    log("Fetching all...");

    const result = await this.find<N>(collectionName, { selector: {} });

    log("Fetched all.");
    return result;
  }

  public async find<N extends CollectionName<C>>(
    collectionName: N,
    options: PouchDB.Find.FindRequest<{}>
  ): Promise<SavedInput<C, N>[]> {
    await this.ready;

    const log = debug.extend(`${collectionName}:find`);
    log("Finding...");

    // allows searching with `id` instead of pouch's internal `_id`,
    // since we call the field `id` externally, and this approach avoids
    // an extra index
    const fixIdSelector = selector =>
      Object.entries(selector)
        .map(([field, predicate]) =>
          field === "id" ? { _id: predicate } : { [field]: predicate }
        )
        .reduce((a, b) => ({ ...a, ...b }), {});

    try {
      const { docs }: any = await this.collections[collectionName].find({
        ...options,
        selector: fixIdSelector(options.selector)
      });

      // make sure we include `id` in the response as well
      const result = docs.map(doc => ({ ...doc, id: doc["_id"] }));

      log("Found.");
      return result;
    } catch (error) {
      console.log(`Error fetching all ${collectionName}\n`);
      console.log(error);
      return ([] as unknown) as SavedInput<C, N>[];
    }
  }

  public async get<N extends CollectionName<C>>(
    collectionName: N,
    id: string
  ): Promise<Historical<SavedInput<C, N>> | null> {
    await this.ready;

    const log = debug.extend(`${collectionName}:get`);
    log("Getting id: %s...", id);

    try {
      const result = await this.collections[collectionName].get(id);

      log("Got id: %s.", id);
      return {
        ...result,
        id
      } as Historical<SavedInput<C, N>>;
    } catch (_) {
      log("Unknown id: %s.", id);
      return null;
    }
  }

  public async add<N extends CollectionName<C>>(
    collectionName: N,
    input: MutationInput<C, N>
  ): Promise<MutationPayload<C, N>> {
    await this.ready;

    const log = debug.extend(`${collectionName}:add`);
    log("Adding...");

    const resourceInputIds = input[collectionName].map(resourceInput =>
      this.generateId(collectionName, resourceInput)
    );

    const resourceInputById = input[collectionName]
      .map((resourceInput, index) => ({
        [resourceInputIds[index]]: resourceInput
      }))
      .reduce((a, b) => ({ ...a, ...b }), {});

    const resources = await Promise.all(
      Object.entries(resourceInputById).map(async ([id, resourceInput]) => {
        // check for existing
        const resource = await this.get(collectionName, id);
        if (resource) {
          return resource;
        }

        await this.collections[collectionName].put({
          ...resourceInput,
          _id: id
        });

        return {
          ...resourceInput,
          id
        } as SavedInput<C, N>;
      })
    );

    const resourcesById = resources
      .map(resource => ({
        [resource.id as string]: resource
      }))
      .reduce((a, b) => ({ ...a, ...b }), {});

    log(
      "Added ids: %o",
      resources.map(({ id }) => id)
    );

    return ({
      [collectionName]: resourceInputIds.map(id => resourcesById[id])
    } as unknown) as MutationPayload<C, N>;
  }

  public async update<M extends MutableCollectionName<C>>(
    collectionName: M,
    input: MutationInput<C, M>
  ): Promise<MutationPayload<C, M>> {
    await this.ready;

    const log = debug.extend(`${collectionName}:update`);
    log("Updating...");

    const resourceInputIds = input[collectionName].map(resourceInput =>
      this.generateId(collectionName, resourceInput)
    );

    const resourceInputById = input[collectionName]
      .map((resourceInput, index) => ({
        [resourceInputIds[index]]: resourceInput
      }))
      .reduce((a, b) => ({ ...a, ...b }), {});

    const resources = await Promise.all(
      Object.entries(resourceInputById).map(async ([id, resourceInput]) => {
        // check for existing
        const resource = await this.get(collectionName, id);
        const { _rev = undefined } = resource ? resource : {};

        await this.collections[collectionName].put({
          ...resourceInput,
          _rev,
          _id: id
        });

        return {
          ...resourceInput,
          id
        } as SavedInput<C, M>;
      })
    );

    const resourcesById = resources
      .map(resource => ({
        [resource.id as string]: resource
      }))
      .reduce((a, b) => ({ ...a, ...b }), {});

    log(
      "Updated ids: %o",
      resources.map(({ id }) => id)
    );
    return ({
      [collectionName]: resourceInputIds.map(id => resourcesById[id])
    } as unknown) as MutationPayload<C, M>;
  }

  public async remove<M extends MutableCollectionName<C>>(
    collectionName: M,
    input: MutationInput<C, M>
  ): Promise<void> {
    await this.ready;

    const log = debug.extend(`${collectionName}:remove`);
    log("Removing...");

    await Promise.all(
      input[collectionName].map(async resourceInput => {
        const id = this.generateId(collectionName, resourceInput);

        const resource = await this.get(collectionName, id);
        const { _rev = undefined } = resource ? resource : {};

        if (_rev) {
          await this.collections[collectionName].put({
            _rev,
            _id: id,
            _deleted: true
          });
        }
      })
    );

    log("Removed.");
  }

  private generateId<N extends CollectionName<C>>(
    collectionName: N,
    input: MutationInput<C, N>[N][number]
  ): string {
    const { idFields } = this.definitions[collectionName];

    return generateId(
      idFields.reduce(
        (obj, field) => ({
          ...obj,
          [field]: input[field]
        }),
        {}
      )
    );
  }
}

type CollectionDatabases<C extends Collections> = {
  [N in CollectionName<C>]: PouchDB.Database;
};
