import { logger } from "@truffle/db/logger";
const debug = logger("db:generate");

import {
  Collections,
  definitions,
  NamedCollectionName,
  IdObject,
  toIdObject,
  Db
} from "@truffle/db/resources";

export { Db, IdObject, toIdObject, NamedCollectionName };
import { forDefinitions } from "@truffle/db/process";
import * as Proc from "@truffle/db/process";

export type Process<
  T = any,
  R extends Proc.RequestType<Collections> | undefined = undefined
> = Proc.Process<Collections, T, R>;

export type Processor<
  A extends unknown[],
  T = any,
  R extends Proc.RequestType<Collections> | undefined = undefined
> = Proc.Processor<Collections, A, T, R>;

export type RequestType = Proc.RequestType<Collections>;

export type ProcessRequest<
  R extends Proc.RequestType<Collections> | undefined
> = Proc.ProcessRequest<Collections, R>;

export type ProcessorRunner = Proc.ProcessorRunner<Collections>;

export { PrepareBatch, _, configure, BatchOptions } from "@truffle/db/process";

export const { forDb, resources: generate } = forDefinitions<Collections>(
  definitions
);
