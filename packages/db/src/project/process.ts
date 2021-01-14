import { logger } from "@truffle/db/logger";
const debug = logger("db:project:process");

import { Collections } from "@truffle/db/resources";
export { DataModel, Db, Run, NamedCollectionName, resources } from "@truffle/db/resources";
export { IdObject, toIdObject } from "@truffle/db/meta";

import * as Meta from "@truffle/db/meta";

export type _ = Meta.Batch._;

export type Process<
  T = any,
  R extends Meta.Process.RequestType<Collections> | undefined = undefined
> = Meta.Process.Process<Collections, T, R>;

export type Processor<
  A extends unknown[],
  T = any,
  R extends Meta.Process.RequestType<Collections> | undefined = undefined
> = Meta.Process.Processor<Collections, A, T, R>;

export type RequestType = Meta.Process.RequestType<Collections>;

export type ProcessRequest<
  R extends Meta.Process.RequestType<Collections> | undefined
> = Meta.Process.ProcessRequest<Collections, R>;

export type ProcessorRunner = Meta.Process.ProcessorRunner<Collections>;

