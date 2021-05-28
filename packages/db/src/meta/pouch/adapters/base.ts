import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:pouch:adapters:base");

import PouchDB from "pouchdb";
import PouchDBDebug from "pouchdb-debug";
import PouchDBFind from "pouchdb-find";

import type { CollectionName, Collections } from "@truffle/db/meta/collections";
import * as Id from "@truffle/db/meta/id";

import type {
  Record,
  SavedRecord,
  RecordReference,
  Adapter,
  Definition,
  Definitions
} from "@truffle/db/meta/pouch/types";

export interface DatabasesOptions<C extends Collections> {
  definitions: Definitions<C>;
  settings: any; // subclasses define their own settings type
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

  public async every<N extends CollectionName<C>, T>(
    collectionName: N
  ): Promise<SavedRecord<T>[]> {
    await this.ready;

    const { rows }: any = await this.collections[collectionName].allDocs({
      include_docs: true
    });

    return (
      rows
        .map(({ doc }) => doc)
        // filter out any views
        .filter(({ views }) => !views)
    );
  }

  public async retrieve<N extends CollectionName<C>, T>(
    collectionName: N,
    records: (Pick<Record<T>, "_id"> | undefined)[]
  ): Promise<(SavedRecord<T> | undefined)[]> {
    await this.ready;

    const unorderedSavedRecords = await this.search<N, T>(collectionName, {
      selector: {
        _id: {
          $in: records
            .filter((obj): obj is Pick<Record<T>, "_id"> => !!obj)
            .map(({ _id }) => _id)
        }
      }
    });

    const savedRecordById = unorderedSavedRecords.reduce(
      (byId, savedRecord) =>
        savedRecord
          ? {
              ...byId,
              [savedRecord._id as string]: savedRecord
            }
          : byId,
      {} as { [id: string]: SavedRecord<T> }
    );

    return records.map(record =>
      record ? savedRecordById[record._id] : undefined
    );
  }

  public async search<N extends CollectionName<C>, T>(
    collectionName: N,
    options: PouchDB.Find.FindRequest<{}>
  ): Promise<SavedRecord<T>[]> {
    await this.ready;

    const { docs }: any = await this.collections[collectionName].find(options);

    const savedRecords: SavedRecord<T>[] = docs;

    return savedRecords;
  }

  public async save<N extends CollectionName<C>, T>(
    collectionName: N,
    records: (Record<T> | undefined)[],
    options: { overwrite?: boolean } = {}
  ): Promise<(SavedRecord<T> | undefined)[]> {
    await this.ready;

    const { overwrite = false } = options;

    const recordsById: {
      [id: string]: Record<T>;
    } = records
      .filter((record): record is Record<T> => !!record)
      .map(record => ({
        [record._id]: record
      }))
      .reduce((a, b) => ({ ...a, ...b }), {} as { [id: string]: Record<T> });

    const existingSavedRecordById: {
      [id: string]: SavedRecord<T>;
    } = (
      await this.retrieve<N, T>(
        collectionName,
        Object.keys(recordsById).map(_id => ({ _id } as Pick<Record<T>, "_id">))
      )
    )
      .filter(
        (existingSavedRecord): existingSavedRecord is SavedRecord<T> =>
          !!existingSavedRecord
      )
      .map(existingSavedRecord => ({
        [existingSavedRecord._id]: existingSavedRecord
      }))
      .reduce(
        (a, b) => ({ ...a, ...b }),
        {} as { [id: string]: SavedRecord<T> }
      );

    const savedRecordById: {
      [id: string]: SavedRecord<T>;
    } = (
      await Promise.all(
        Object.entries(recordsById).map(async ([_id, record]) => {
          const existingSavedRecord = existingSavedRecordById[_id];

          if (existingSavedRecord && !overwrite) {
            return existingSavedRecord;
          }

          const { _rev = undefined } = existingSavedRecord || {};

          const { rev } = await this.collections[collectionName].put({
            ...record,
            _rev
          });

          return {
            ...record,
            _rev: rev
          } as SavedRecord<T>;
        })
      )
    )
      .map(savedRecord => ({ [savedRecord._id]: savedRecord }))
      .reduce(
        (a, b) => ({ ...a, ...b }),
        {} as { [id: string]: SavedRecord<T> }
      );

    return records.map(record => record && savedRecordById[record._id]);
  }

  public async delete<N extends CollectionName<C>, T>(
    collectionName: N,
    references: (RecordReference<T> | undefined)[]
  ): Promise<void> {
    await this.ready;

    const savedRecords = await this.retrieve<N, T>(collectionName, references);

    const savedRecordById = savedRecords
      .filter((savedRecord): savedRecord is SavedRecord<T> => !!savedRecord)
      .map(savedRecord => ({
        [savedRecord._id]: savedRecord
      }))
      .reduce(
        (a, b) => ({ ...a, ...b }),
        {} as { [id: string]: SavedRecord<T> }
      );

    await Promise.all(
      Object.values(savedRecordById).map(async ({ _id, _rev }) => {
        await this.collections[collectionName].put({
          _rev,
          _id,
          _deleted: true
        });
      })
    );
  }
}

type CollectionDatabases<C extends Collections> = {
  [N in CollectionName<C>]: PouchDB.Database;
};
