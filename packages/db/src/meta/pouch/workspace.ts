import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:pouch:workspace");

import type PouchDB from "pouchdb";

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
import type { Workspace } from "@truffle/db/meta/data";

import type {
  Record,
  RecordReference,
  Adapter,
  Definitions
} from "@truffle/db/meta/pouch/types";

export interface AdapterWorkspaceConstructorOptions<C extends Collections> {
  adapter: Adapter<C>;
  definitions: Definitions<C>;
}

export class AdapterWorkspace<C extends Collections> implements Workspace<C> {
  private adapter: Adapter<C>;
  private generateId: Id.GenerateId<C>;

  constructor({ adapter, definitions }: AdapterWorkspaceConstructorOptions<C>) {
    this.adapter = adapter;
    this.generateId = Id.forDefinitions(definitions);
  }

  public async all<N extends CollectionName<C>>(
    collectionName: N
  ): Promise<SavedInput<C, N>[]> {
    const log = debug.extend(`${collectionName}:all`);
    log("Fetching all...");

    try {
      const savedRecords = await this.adapter.every<N, Input<C, N>>(
        collectionName
      );

      log("Found.");
      return savedRecords.map(savedRecord =>
        this.unmarshal(collectionName, savedRecord)
      );
    } catch (error) {
      log("Error fetching all %s, got error: %O", collectionName, error);
      throw error;
    }
  }

  public async find<N extends CollectionName<C>>(
    collectionName: N,
    options: (Id.IdObject<C, N> | undefined)[] | PouchDB.Find.FindRequest<{}>
  ): Promise<(SavedInput<C, N> | undefined)[]> {
    const log = debug.extend(`${collectionName}:find`);
    log("Finding...");

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
      // handle convenient interface for getting a bunch of IDs while preserving
      // order of input request
      const savedRecords = Array.isArray(options)
        ? await this.adapter.retrieve<N, Input<C, N>>(
            collectionName,
            options.map(reference =>
              reference
                ? ({ _id: reference.id } as RecordReference<Input<C, N>>)
                : undefined
            )
          )
        : await this.adapter.search<N, Input<C, N>>(collectionName, {
            ...options,
            selector: fixIdSelector(options.selector)
          });

      log("Found.");
      return savedRecords.map(savedRecord =>
        savedRecord ? this.unmarshal(collectionName, savedRecord) : undefined
      );
    } catch (error) {
      log("Error fetching all %s, got error: %O", collectionName, error);
      throw error;
    }
  }

  public async get<N extends CollectionName<C>>(
    collectionName: N,
    id: string | undefined
  ): Promise<SavedInput<C, N> | undefined> {
    if (typeof id === "undefined") {
      return;
    }

    const [savedRecord] = await this.adapter.retrieve<N, Input<C, N>>(
      collectionName,
      [{ _id: id } as RecordReference<Input<C, N>>]
    );

    if (savedRecord) {
      return this.unmarshal(collectionName, savedRecord);
    }
  }

  public async add<N extends CollectionName<C>>(
    collectionName: N,
    input: MutationInput<C, N>
  ): Promise<MutationPayload<C, N>> {
    const log = debug.extend(`${collectionName}:add`);
    log("Adding...");

    const records = input[collectionName].map(input =>
      input ? this.marshal(collectionName, input) : undefined
    );

    const savedRecords = await this.adapter.save<N, Input<C, N>>(
      collectionName,
      records,
      { overwrite: false }
    );

    const addedInputs = savedRecords.map(savedRecord =>
      savedRecord ? this.unmarshal(collectionName, savedRecord) : undefined
    );

    log(
      "Added ids: %o",
      addedInputs
        .filter((input): input is SavedInput<C, N> => !!input)
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

    const records = input[collectionName].map(input =>
      input ? this.marshal(collectionName, input) : undefined
    );

    const savedRecords = await this.adapter.save<M, Input<C, M>>(
      collectionName,
      records,
      { overwrite: true }
    );

    const updatedInputs = savedRecords.map(savedRecord =>
      savedRecord ? this.unmarshal(collectionName, savedRecord) : undefined
    );

    log(
      "Updated ids: %o",
      updatedInputs
        .filter((input): input is SavedInput<C, M> => !!input)
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

    const records = input[collectionName].map(input =>
      input ? this.marshal(collectionName, input) : undefined
    );

    await this.adapter.delete(collectionName, records);

    log("Removed.");
  }

  private marshal<N extends CollectionName<C>>(
    collectionName: N,
    input: Input<C, N>
  ): Record<Input<C, N>> {
    const id = this.generateId<N>(collectionName, input);

    if (typeof id === "undefined") {
      throw new Error(`Unable to generate ID for "${collectionName}" resource`);
    }

    return {
      ...input,
      _id: id
    };
  }

  private unmarshal<N extends CollectionName<C>>(
    collectionName: N,
    record: any
  ): SavedInput<C, N> {
    const id = (record as Record<Input<C, N>>)._id;

    // remove internal properties:
    //   - PouchDB properties (begin with _)
    //   - ours (begin with $, reserved for future use)
    const fieldNamePattern = /^[^_$]/;
    const input: Input<C, N> = Object.entries(record)
      .filter(([propertyName]) => propertyName.match(fieldNamePattern))
      .map(([fieldName, value]) => ({ [fieldName]: value }))
      .reduce((a, b) => ({ ...a, ...b }), {});

    return {
      ...input,
      id
    } as SavedInput<C, N>;
  }
}
