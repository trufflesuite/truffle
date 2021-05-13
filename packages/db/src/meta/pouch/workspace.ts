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
import type { Workspace, Historical } from "@truffle/db/meta/data";

import type { Adapter, Definitions } from "@truffle/db/meta/pouch/types";

export interface AdapterWorkspaceConstructorOptions<C extends Collections> {
  adapter: Adapter<C>;
  definitions: Definitions<C>;
}

export class AdapterWorkspace<C extends Collections> implements Workspace<C> {
  private adapter: Adapter<C>;
  private generateId: Id.GenerateId<C>;

  constructor({
    adapter,
    definitions
  }: AdapterWorkspaceConstructorOptions<C>) {
    this.adapter = adapter;
    this.generateId = Id.forDefinitions(definitions);
  }

  public async all<N extends CollectionName<C>>(
    collectionName: N
  ): Promise<SavedInput<C, N>[]> {
    const log = debug.extend(`${collectionName}:all`);
    log("Fetching all...");

    try {
      const result = await this.adapter.every<N, SavedInput<C, N>>(collectionName);

      log("Found.");
      return result as SavedInput<C, N>[];
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
      if (Array.isArray(options)) {
        const references = options;

        return await this.adapter.retrieve<N, SavedInput<C, N>>(
          collectionName,
          references as (Pick<SavedInput<C, N>, "id"> | undefined)[]
        ) as (SavedInput<C, N> | undefined)[];
      }

      const result = await this.adapter.search<N, SavedInput<C, N>>(
        collectionName,
        options
      );

      log("Found.");
      return result as SavedInput<C, N>[];
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
    const [savedInput] = await this.adapter.retrieve<N, SavedInput<C, N>>(
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

    const addedInputs = await this.adapter.record<N, SavedInput<C, N>>(
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

    const updatedInputs = await this.adapter.record<M, SavedInput<C, M>>(
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

    await this.adapter.forget(collectionName, inputsWithIds);

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
