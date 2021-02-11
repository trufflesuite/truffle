import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:pouch:adapters:base");

import PouchDB from "pouchdb";
import PouchDBDebug from "pouchdb-debug";
import PouchDBFind from "pouchdb-find";

import type {
  CollectionName,
  Collections,
  MutationInput,
  MutationPayload,
  MutableCollectionName,
  SavedInput
} from "@truffle/db/meta/collections";
import * as Id from "@truffle/db/meta/id";
import type { Workspace, Historical } from "@truffle/db/meta/data";

import type { Definition, Definitions } from "@truffle/db/meta/pouch/types";

/**
 * Aggegrates logic for interacting wth a set of PouchDB databases identified
 * by resource collection name.
 */
export abstract class Databases<C extends Collections> implements Workspace<C> {
  private collections: CollectionDatabases<C>;
  private definitions: Definitions<C>;
  private generateId: Id.GenerateId<C>;

  private ready: Promise<void>;

  constructor(options) {
    this.setup(options.settings);

    this.definitions = options.definitions;
    this.generateId = Id.forDefinitions(this.definitions);

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

    try {
      const { rows }: any = await this.collections[collectionName].allDocs({
        include_docs: true
      });

      const result = rows
        // make sure we include `id` in the response as well
        .map(({ doc }) => ({ ...doc, id: doc["_id"] }))
        // but filter out any views
        .filter(({ views }) => !views);

      log("Found.");
      return result;
    } catch (error) {
      log("Error fetching all %s, got error: %O", collectionName, error);
      throw error;
    }
  }

  public async find<N extends CollectionName<C>>(
    collectionName: N,
    options: (Id.IdObject<C, N> | undefined)[] | PouchDB.Find.FindRequest<{}>
  ): Promise<(SavedInput<C, N> | undefined)[]> {
    await this.ready;

    const log = debug.extend(`${collectionName}:find`);
    log("Finding...");

    // handle convenient interface for getting a bunch of IDs while preserving
    // order of input request
    if (Array.isArray(options)) {
      const references = options;
      const unordered = await this.find<N>(collectionName, {
        selector: {
          id: {
            $in: references
              .filter(obj => obj)
              .map(({ id }: Id.IdObject<C, N>) => id)
          }
        }
      });

      const byId = unordered.reduce(
        (byId, savedInput) =>
          savedInput
            ? {
                ...byId,
                [savedInput.id as string]: savedInput
              }
            : byId,
        {} as { [id: string]: SavedInput<C, N> }
      );

      return references.map(reference =>
        reference ? byId[reference.id] : undefined
      );
    }

    // allows searching with `id` instead of pouch's internal `_id`,
    // since we call the field `id` externally, and this approach avoids
    // an extra index
    const fixIdSelector = (selector: PouchDB.Find.Selector) =>
      Object.entries(selector)
        .map(
          ([field, predicate]): PouchDB.Find.Selector =>
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
      log("Error fetching all %s, got error: %O", collectionName, error);
      throw error;
    }
  }

  public async get<N extends CollectionName<C>>(
    collectionName: N,
    id: string | undefined
  ): Promise<Historical<SavedInput<C, N>> | undefined> {
    await this.ready;

    if (typeof id !== "string") {
      return;
    }

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
      return;
    }
  }

  public async add<N extends CollectionName<C>>(
    collectionName: N,
    input: MutationInput<C, N>
  ): Promise<MutationPayload<C, N>> {
    await this.ready;

    const log = debug.extend(`${collectionName}:add`);
    log("Adding...");

    const resourceInputIds = input[collectionName].map(
      resourceInput => this.generateId<N>(collectionName, resourceInput) || ""
    );

    const resourceInputById = input[collectionName]
      .filter((_, index) => resourceInputIds[index])
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

    const resourceInputIds = input[collectionName]
      .map(resourceInput => this.generateId<M>(collectionName, resourceInput))
      .filter((id): id is string => id !== undefined);

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
        if (!id) {
          return;
        }

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
}

type CollectionDatabases<C extends Collections> = {
  [N in CollectionName<C>]: PouchDB.Database;
};
