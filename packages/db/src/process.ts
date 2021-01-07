/**
 * @category Primary
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:process");

import * as graphql from "graphql";

import * as Meta from "./meta";
import * as System from "./system";
import {
  Collections,
  CollectionName,
  Input,
  Resource,
  IdObject
} from "./resources";

/**
 * @hidden
 */
export type Process<
  T = any,
  R extends RequestType | undefined = undefined
> = Meta.Process.Process<Collections, T, R>;

/**
 * @hidden
 */
export type Processor<
  A extends unknown[],
  T = any,
  R extends RequestType | undefined = undefined
> = Meta.Process.Processor<Collections, A, T, R>;

/**
 * @hidden
 */
export type RequestType = Meta.Process.RequestType<Collections>;

/**
 * @hidden
 */
export type ProcessRequest<
  R extends RequestType | undefined
> = Meta.Process.ProcessRequest<Collections, R>;

/**
 * @hidden
 */
export type ProcessorRunner = Meta.Process.ProcessorRunner<Collections>;

export namespace ResourceProcessors {
  /**
   * `resources.load`
   *
   * Loads resource inputs and processes into
   * corresponding [[IdObject | IdObjects]].
   *
   * The resulting array will always have the same length as the inputs, with
   * each result corresponding to the input at the same index. Invalid inputs
   * correspond to `null` resource results.
   *
   * **Note**: This function returns a generator. For `async` behavior, use
   * with a [[Meta.Process.ProcessorRunner | ProcessorRunner]] such as
   * that returned by [[Run.forDb]] or [[Project.run]].
   *
   * @example
   * ```typescript
   * import { connect, Resources, Process } from "@truffle/db";
   *
   * const db = connect({
   *   // ...
   * });
   *
   * const { Run, resources } = Process;
   *
   * const { run } = Run.forDb(db);
   *
   * const sources: (
   *   | Resources.IdObject<"sources">
   *   | null
   * )[] = await run(resources.load, "sources", [
   *   { sourcePath: "...", contents: "..." }
   * ]);
   * ```
   */
  export type Load = <N extends CollectionName>(
    collectionName: N,
    inputs: Input<N>[]
  ) => Process<IdObject<N>[]>;

  /**
   * `resources.get`
   *
   * Retrieves full or partial representations of a resource given its ID.
   * Parameter `document` is a GraphQL DocumentNode that defines a fragment
   * on the resource object type, to control which fields are returned.
   *
   * **Note**: This function returns a generator. For `async` behavior, use
   * with a [[Meta.Process.ProcessorRunner | ProcessorRunner]] such as
   * that returned by [[Run.forDb]] or [[Project.run]].
   *
   * @example
   * ```typescript
   * import gql from "graphql-tag";
   * import { connect, Process } from "@truffle/db";
   *
   * const db = connect({
   *   // ...
   * });
   *
   * const { Run, resources } = Process;
   *
   * const { run } = Run.forDb(db);
   *
   * const { contents } = await run(resources.get, "sources", "0x...", gql`
   *   fragment Contents on Source {
   *     contents
   *   }
   * `);
   * ```
   */
  export type Get = <N extends CollectionName>(
    collectionName: N,
    id: string,
    document: graphql.DocumentNode
  ) => Process<Resource<N>>;

  /**
   * `resources.find`
   *
   * Retrieves full or partial representations of all resources in a list of
   * given IDs.
   * Parameter `document` is a GraphQL DocumentNode that defines a fragment
   * on the resource object type, to control which fields are returned.
   *
   * The resulting array will always have the same length as the provided IDs,
   * with each result corresponding to the ID at the same index. Unknown IDs
   * will have `null` entries in the resulting array.
   *
   * **Note**: This function returns a generator. For `async` behavior, use
   * with a [[Meta.Process.ProcessorRunner | ProcessorRunner]] such as
   * that returned by [[Run.forDb]] or [[Project.run]].
   *
   * @example
   * ```typescript
   * import gql from "graphql-tag";
   * import { connect, Process } from "@truffle/db";
   *
   * const db = connect({
   *   // ...
   * });
   *
   * const { Run, resources } = Process;
   *
   * const { run } = Run.forDb(db);
   *
   * const sources: (
   *  | Pick<Resources.Resource<"sources">, "contents">
   *  | null
   * )[] = await run(resources.find, "sources", ["0x...", "0x..."], gql`
   *   fragment Contents on Source {
   *     contents
   *   }
   * `);
   * ```
   */
  export type Find = <N extends CollectionName>(
    collectionName: N,
    ids: string[],
    document: graphql.DocumentNode
  ) => Process<Resource<N>[]>;

  /**
   * `resources.all`
   *
   * Retrieves full or partial representations of all known resources for a
   * given collection name.
   * Parameter `document` is a GraphQL DocumentNode that defines a fragment
   * on the resource object type, to control which fields are returned.
   *
   * **Note**: This function returns a generator. For `async` behavior, use
   * with a [[Meta.Process.ProcessorRunner | ProcessorRunner]] such as
   * that returned by [[Run.forDb]] or [[Project.run]].
   *
   * @example
   * ```typescript
   * import gql from "graphql-tag";
   * import { connect, Resources, Process } from "@truffle/db";
   *
   * const db = connect({
   *   // ...
   * });
   *
   * const { Run, resources } = Process;
   *
   * const { run } = Run.forDb(db);
   *
   * const sources: Pick<
   *   Resources.Resource<"sources">,
   *   "contents"
   * >[] = await run(resources.all, "sources", gql`
   *   fragment Contents on Source {
   *     contents
   *   }
   * `);
   * ```
   */
  export type All = <N extends CollectionName>(
    collectionName: N,
    document: graphql.DocumentNode
  ) => Process<Resource<N>[]>;
}

/**
 * Programmatic interfaces for reading/writing resources.
 *
 * **Note**: These functions return generators. For `async` behavior, use
 * with a [[Meta.Process.ProcessorRunner | ProcessorRunner]] such as
 * that returned by [[Run.forDb]] or [[Project.run]].
 *
 * For full documentation, please see [[ResourceProcessors]] or links to
 * specific function types below.
 *
 * @example
 * ```typescript
 * import { Process } from "@truffle/db";
 * const { resources } = Process;
 * ```
 */
export const resources: {
  load: ResourceProcessors.Load;
  get: ResourceProcessors.Get;
  find: ResourceProcessors.Find;
  all: ResourceProcessors.All;
} = System.resources;

export namespace Run {
  export const forDb = System.forDb;
}
