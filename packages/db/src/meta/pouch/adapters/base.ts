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
  Input,
  SavedInput
} from "@truffle/db/meta/collections";
import * as Id from "@truffle/db/meta/id";
import type { Historical } from "@truffle/db/meta/data";

import type { Definition, Definitions } from "@truffle/db/meta/pouch/types";

export interface DatabasesOptions<C extends Collections> {
  definitions: Definitions<C>;
  settings: any;
}

export interface Adapter<C extends Collections> {
  every<N extends CollectionName<C>, I extends { id: string }>(
    collectionName: N
  ): Promise<Historical<I>[]>;

  retrieve<N extends CollectionName<C>, I extends { id: string }>(
    collectionName: N,
    references: (Pick<I, "id"> | undefined)[]
  ): Promise<(Historical<I> | undefined)[]>;

  search<N extends CollectionName<C>, I extends { id: string }>(
    collectionName: N,
    options: PouchDB.Find.FindRequest<{}>
  ): Promise<Historical<I>[]>;

  record<N extends CollectionName<C>, I extends { id: string }>(
    collectionName: N,
    inputs: (I | undefined)[],
    options: { overwrite?: boolean }
  ): Promise<(Historical<I> | undefined)[]>;

  forget<N extends CollectionName<C>, I extends { id: string }>(
    collectionName: N,
    references: (Pick<I, "id"> | undefined)[]
  ): Promise<void>;
}


/**
 * Aggegrates logic for interacting wth a set of PouchDB databases identified
 * by resource collection name.
 */
export abstract class Databases<C extends Collections> implements Adapter<C> {
  private collections: CollectionDatabases<C>;
  private definitions: Definitions<C>;
  private generateId: Id.GenerateId<C>;

  private ready: Promise<void>;

  constructor(options: DatabasesOptions<C>) {
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

  public async every<N extends CollectionName<C>, I extends { id: string }>(
    collectionName: N
  ): Promise<Historical<I>[]> {
    await this.ready;

    const { rows }: any = await this.collections[collectionName].allDocs({
      include_docs: true
    });

    const result = rows
      // make sure we include `id` in the response as well
      .map(({ doc }) => ({ ...doc, id: doc["_id"] }))
      // but filter out any views
      .filter(({ views }) => !views);

    return result;
  }

  public async retrieve<N extends CollectionName<C>, I extends { id: string }>(
    collectionName: N,
    references: (Pick<I, "id"> | undefined)[]
  ) {
    await this.ready;

    const unordered = await this.search<N, I>(collectionName, {
      selector: {
        id: {
          $in: references
            .filter((obj): obj is Pick<I, "id"> => !!obj)
            .map(({ id }) => id)
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
      {} as { [id: string]: Historical<I> }
    );

    return references.map(reference =>
      reference ? byId[reference.id] : undefined
    );
  }

  public async search<N extends CollectionName<C>, I extends { id: string }>(
    collectionName: N,
    options: PouchDB.Find.FindRequest<{}>
  ) {
    await this.ready;

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

    const { docs }: any = await this.collections[collectionName].find({
      ...options,
      selector: fixIdSelector(options.selector)
    });

    // make sure we include `id` in the response as well
    const result: Historical<I>[] = docs.map(doc => {
      const {
        _id,
        _rev,
        ...retrievedInput
      } = doc;

      return {
        ...retrievedInput,
        _rev,
        id: _id
      };
    });

    return result;
  }

  public async record<N extends CollectionName<C>, I extends { id: string }>(
    collectionName: N,
    inputs: (I | undefined)[],
    options: { overwrite?: boolean } = {}
  ) {
    await this.ready;

    const { overwrite = false } = options;

    const inputsById: {
      [id: string]: I
    } = inputs
      .filter((input): input is I => !!input)
      .map((input) => ({
        [input.id]: input
      }))
      .reduce((a, b) => ({ ...a, ...b }), {} as { [id: string]: I });

    const currentInputsById: {
      [id: string]: Historical<I>;
    } = (await this.retrieve<N, I>(
      collectionName,
      Object.keys(inputsById).map(id => ({ id }))
    ))
      .filter((currentInput): currentInput is Historical<I> => !!currentInput)
      .map(currentInput => ({ [currentInput.id]: currentInput }))
      .reduce(
        (a, b) => ({ ...a, ...b }),
        {} as { [id: string]: Historical<I> }
      );

    const savedInputsById: {
      [id: string]: Historical<I>
    } = (
      await Promise.all(
        Object.entries(inputsById)
          .map(async ([id, input]) => {
            const currentInput = currentInputsById[id];

            if (currentInput && !overwrite) {
              return currentInput;
            }

            const { _rev = undefined } = currentInput || {};

            const { rev } = await this.collections[collectionName].put({
              ...input,
              _rev,
              _id: id
            });

            return {
              ...input,
              _rev: rev,
              id
            } as Historical<I>;
          })
      )
    )
      .map(savedInput => ({ [savedInput.id]: savedInput }))
      .reduce(
        (a, b) => ({ ...a, ...b }),
        {} as { [id: string]: Historical<I> }
      );

    return inputs.map(input => input && savedInputsById[input.id]);
  }

  public async forget<N extends CollectionName<C>, I extends { id: string }>(
    collectionName: N,
    references: (Pick<I, "id"> | undefined)[]
  ) {
    await this.ready;

    const retrievedInputs = await this.retrieve<N, I>(
      collectionName,
      references
    );

    const retrievedInputsById = retrievedInputs
      .filter(
        (retrievedInput): retrievedInput is Historical<I> => !!retrievedInput
      )
      .map(retrievedInput => ({
        [retrievedInput.id]: retrievedInput
      }))
      .reduce(
        (a, b) => ({ ...a, ...b }),
        {} as { [id: string]: Historical<I> }
      );

    await Promise.all(
      Object.values(retrievedInputsById)
        .map(async ({ id, _rev }) => {
          await this.collections[collectionName].put({
            _rev,
            _id: id,
            _deleted: true
          });
        })
    );
  }

  public async all<N extends CollectionName<C>>(
    collectionName: N
  ): Promise<Historical<SavedInput<C, N>>[]> {
    const log = debug.extend(`${collectionName}:all`);
    log("Fetching all...");

    try {
      const result = await this.every<N, SavedInput<C, N>>(collectionName);

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
  ): Promise<(Historical<SavedInput<C, N>> | undefined)[]> {
    await this.ready;

    const log = debug.extend(`${collectionName}:find`);
    log("Finding...");

    try {
      // handle convenient interface for getting a bunch of IDs while preserving
      // order of input request
      if (Array.isArray(options)) {
        const references = options;

        return await this.retrieve<N, SavedInput<C, N>>(
          collectionName,
          references as (Pick<SavedInput<C, N>, "id"> | undefined)[]
        );
      }

      const result = await this.search<N, SavedInput<C, N>>(
        collectionName,
        options
      );

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
    if (typeof id === "undefined") {
      return;
    }
    const [savedInput] = await this.retrieve<N, SavedInput<C, N>>(
      collectionName,
      [{ id }]
    );

    return savedInput;
  }

  public async add<N extends CollectionName<C>>(
    collectionName: N,
    input: MutationInput<C, N>
  ): Promise<MutationPayload<C, N>> {
    const log = debug.extend(`${collectionName}:add`);
    log("Adding...");

    const inputsWithIds = input[collectionName].map(
      input => this.attachId(collectionName, input)
    );

    const addedInputs = await this.record<N, SavedInput<C, N>>(
      collectionName,
      inputsWithIds,
      { overwrite: false }
    );

    log(
      "Added ids: %o",
      addedInputs
        .filter((input): input is Historical<SavedInput<C, N>> => !!input)
        .map(({ id }) => id)
    );

    return {
      [collectionName]: addedInputs
    } as MutationPayload<C, N>;
  }

  public async update<M extends MutableCollectionName<C>>(
    collectionName: M,
    input: MutationInput<C, M>
  ): Promise<MutationPayload<C, M>> {
    const log = debug.extend(`${collectionName}:update`);
    log("Updating...");

    const inputsWithIds = input[collectionName].map(
      input => this.attachId(collectionName, input)
    );

    const updatedInputs = await this.record<M, SavedInput<C, M>>(
      collectionName,
      inputsWithIds,
      { overwrite: true }
    );

    log(
      "Updated ids: %o",
      updatedInputs
        .filter((input): input is Historical<SavedInput<C, M>> => !!input)
        .map(({ id }) => id)
    );

    return {
      [collectionName]: updatedInputs
    } as MutationPayload<C, M>;
  }

  public async remove<M extends MutableCollectionName<C>>(
    collectionName: M,
    input: MutationInput<C, M>
  ): Promise<void> {
    const log = debug.extend(`${collectionName}:remove`);
    log("Removing...");

    const inputsWithIds = input[collectionName].map(
      input => this.attachId(collectionName, input)
    );

    await this.forget(collectionName, inputsWithIds);

    log("Removed.");
  }

  private attachId<N extends CollectionName<C>>(
    collectionName: N,
    input: Input<C, N> | undefined
  ) {
    const id = this.generateId<N>(collectionName, input);

    if (typeof id === "undefined") {
      return;
    }

    return {
      ...input,
      id
    } as SavedInput<C, N>;
  }
}

type CollectionDatabases<C extends Collections> = {
  [N in CollectionName<C>]: PouchDB.Database;
};
