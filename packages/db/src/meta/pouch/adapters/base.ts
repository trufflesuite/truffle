import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:pouch:adapters:base");

import PouchDB from "pouchdb";
import PouchDBDebug from "pouchdb-debug";
import PouchDBFind from "pouchdb-find";

import type {
  CollectionName,
  Collections,
} from "@truffle/db/meta/collections";
import * as Id from "@truffle/db/meta/id";
import type { Historical } from "@truffle/db/meta/data";

import type {
  Adapter,
  Definition,
  Definitions
} from "@truffle/db/meta/pouch/types";

export interface DatabasesOptions<C extends Collections> {
  definitions: Definitions<C>;
  settings: any;
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

}

type CollectionDatabases<C extends Collections> = {
  [N in CollectionName<C>]: PouchDB.Database;
};
