import { logger } from "@truffle/db/logger";
const debug = logger("db:project:process");

import {
  Collections,
  definitions,
  NamedCollectionName
} from "@truffle/db/resources";
import { Db, IdObject, toIdObject } from "@truffle/db/meta";

export { Db, IdObject, toIdObject, NamedCollectionName };
import * as Base from "@truffle/db/process";
export { PrepareBatch, _, configure, BatchOptions } from "@truffle/db/process";

export type Process<
  T = any,
  R extends Base.RequestType<Collections> | undefined = undefined
> = Base.Process<Collections, T, R>;

export type Processor<
  A extends unknown[],
  T = any,
  R extends Base.RequestType<Collections> | undefined = undefined
> = Base.Processor<Collections, A, T, R>;

export type RequestType = Base.RequestType<Collections>;

export type ProcessRequest<
  R extends Base.RequestType<Collections> | undefined
> = Base.ProcessRequest<Collections, R>;

export type ProcessorRunner = Base.ProcessorRunner<Collections>;

export const { forDb, resources } = Base.forDefinitions<Collections>(definitions);
