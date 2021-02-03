/**
 * \@truffle/db Meta system
 *
 * This exposes the [[forDefinitions]] function for building a concrete
 * system for any defined set of resources.
 *
 * @category Internal
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:meta");

export { IdObject, toIdObject } from "./id";
export {
  Collections,
  CollectionName,
  NamedCollectionName,
  MutableCollectionName,
  Resource,
  Input,
  IdFields,
  MutableResource,
  NamedResource
} from "./collections";
export { Db, ConnectOptions } from "./interface";
export { SavedInput, Workspace } from "./data";
export { Definition, Definitions } from "./definitions";

import * as Graph from "./graph";
export { Graph };

import * as Pouch from "./pouch";
export { Pouch };

import * as Process from "./process";
export { Process };

import * as Batch from "./batch";
export { Batch };

import * as Id from "./id";
export { Id };

import { Collections } from "./collections";
import { Definitions } from "./definitions";
import { forAttachAndSchema } from "./interface";

export const forDefinitions = <C extends Collections>(
  definitions: Definitions<C>
) => {
  const generateId = Id.forDefinitions(definitions);
  const attach = Pouch.forDefinitions(definitions);
  const schema = Graph.forDefinitions(definitions);

  const { connect, serve } = forAttachAndSchema({
    attach,
    schema
  });

  const { forDb, resources } = Process.forDefinitions(definitions);

  return {
    generateId,
    schema,
    attach,
    connect,
    serve,
    resources,
    forDb
  };
};
