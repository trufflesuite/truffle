/**
 * Meta
 */ /** */
import { logger } from "@truffle/db/logger";
const debug = logger("db:meta");

export { IdObject, toIdObject, generateId } from "./ids";
export {
  Collections,
  CollectionName,
  NamedCollectionName,
  Input,
  Resource,
  MutableResource,
  NamedResource
} from "./collections";
export { Db } from "./interface";
export { Workspace } from "./data";
export { Definition, Definitions } from "./definitions";

import * as GraphQl from "./graphql";
export { GraphQl };

import * as Pouch from "./pouch";
export { Pouch };

import * as Process from "./process";
export { Process };

import * as Batch from "./batch";
export { Batch };

import { Collections } from "./collections";
import { Definitions } from "./definitions";
import { forAttachAndSchema } from "./interface";

export const forDefinitions = <C extends Collections>(
  definitions: Definitions<C>
) => {
  const attach = Pouch.forDefinitions(definitions);
  const schema = GraphQl.forDefinitions(definitions);

  const { connect, serve } = forAttachAndSchema({
    attach,
    schema
  });

  const { forDb, resources } = Process.forDefinitions(definitions);

  return {
    schema,
    attach,
    connect,
    serve,
    resources,
    forDb
  };
};
