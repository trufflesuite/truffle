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
  Historical,
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
      const records = await this.adapter.every<N, Historical<Input<C, N>>>(
        collectionName
      );

      log("Found.");
      return records.map(record => this.unmarshal(collectionName, record));
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

    try {
      // handle convenient interface for getting a bunch of IDs while preserving
      // order of input request
      const records = Array.isArray(options)
        ? await this.adapter.retrieve<N, Historical<Input<C, N>>>(
            collectionName,
            options.map(reference =>
              reference ? { _id: reference.id } : undefined
            ) as (Pick<Historical<Input<C, N>>, "_id"> | undefined)[]
          )
        : await this.adapter.search<N, Historical<Input<C, N>>>(
            collectionName,
            options
          );

      log("Found.");
      return records.map(record =>
        record ? this.unmarshal(collectionName, record) : undefined
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
    const [savedInput] = await this.adapter.retrieve<
      N,
      Historical<Input<C, N>>
    >(collectionName, [{ _id: id } as Pick<Historical<Input<C, N>>, "_id">]);

    if (savedInput) {
      return this.unmarshal(collectionName, savedInput);
    }
  }

  public async add<N extends CollectionName<C>>(
    collectionName: N,
    input: MutationInput<C, N>
  ): Promise<MutationPayload<C, N>> {
    const log = debug.extend(`${collectionName}:add`);
    log("Adding...");

    const inputsWithIds = input[collectionName].map(input =>
      input ? this.marshal(collectionName, input) : undefined
    );

    const records = await this.adapter.record<N, Historical<Input<C, N>>>(
      collectionName,
      inputsWithIds,
      { overwrite: false }
    );

    const addedInputs = records.map(record =>
      record ? this.unmarshal(collectionName, record) : undefined
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

    const inputsWithIds = input[collectionName].map(input =>
      input ? this.marshal(collectionName, input) : undefined
    );

    const records = await this.adapter.record<M, Historical<Input<C, M>>>(
      collectionName,
      inputsWithIds,
      { overwrite: true }
    );

    const updatedInputs = records.map(record =>
      record ? this.unmarshal(collectionName, record) : undefined
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

    const inputsWithIds = input[collectionName].map(input =>
      input ? this.marshal(collectionName, input) : undefined
    );

    await this.adapter.forget(collectionName, inputsWithIds);

    log("Removed.");
  }

  private marshal<N extends CollectionName<C>>(
    collectionName: N,
    input: Input<C, N>
  ): Historical<Input<C, N>> {
    const id = this.generateId<N>(collectionName, input);

    if (typeof id === "undefined") {
      throw new Error(`Unable to generate ID for "${collectionName}" resource`);
    }

    return {
      ...input,
      _id: id
    } as Historical<Input<C, N>>;
  }

  private unmarshal<N extends CollectionName<C>>(
    collectionName: N,
    record: any
  ): SavedInput<C, N> {
    const id = (record as Historical<Input<C, N>>)._id;

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
