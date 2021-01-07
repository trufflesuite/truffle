/**
 * Namespace that represents the kinds of entities managed by @truffle/db
 *
 * A number of the types defined by this namespace are useful when working
 * with @truffle/db programmatically in TypeScript projects. In particular,
 * see [[Resource]], [[Input]], and [[IdObject]].
 *
 * @example Using helper types to save and retrieve a source:
 *
 * ```typescript
 * import gql from "graphql-tag";
 * import { connect, Process, Resources } from "@truffle/db";
 *
 * const db = connect({
 *   // ...
 * });
 *
 * const { run } = Process.Run.forDb(db);
 *
 * const [ { id } ]: Resources.IdObject<"sources">[] = await run(
 *   Process.resources.load,
 *   "sources",
 *   [{ contents: "pragma solidity ..." }]
 * );
 *
 * const { contents }: Resources.Resource<"sources"> = await run(
 *   Process.resources.get,
 *   "sources",
 *   id,
 *   gql`fragment Contents on Source { contents }`
 * );
 * ```
 *
 * See also [[connect]], [[Process.Run.forDb]], and [[Process.resources]].
 *
 * @category Primary
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:resources");

export {
  Collections,
  DataModel,
  Db,
  Definition,
  Definitions,
  CollectionName,
  MutableCollectionName,
  NamedCollectionName,
  Input,
  Resource,
  IdObject,
  toIdObject,
  Workspace
} from "./types";

import { Definitions } from "./types";

import { sources } from "./sources";
import { bytecodes } from "./bytecodes";
import { compilations } from "./compilations";
import { contracts } from "./contracts";
import { contractInstances } from "./contractInstances";
import { networks } from "./networks";
import { nameRecords } from "./nameRecords";
import { projects } from "./projects";
import { projectNames } from "./projectNames";
import { networkGenealogies } from "./networkGenealogies";

/**
 * @category Internal
 */
export const definitions: Definitions = {
  sources,
  bytecodes,
  compilations,
  contracts,
  contractInstances,
  networks,
  nameRecords,
  projects,
  projectNames,
  networkGenealogies
};
