import { logger } from "@truffle/db/logger";
const debug = logger("db:project:process");

import { Collections } from "@truffle/db/resources";
export { DataModel, Db, Run, NamedCollectionName, resources } from "@truffle/db/resources";
export { IdObject, toIdObject } from "@truffle/db/meta";

import { Process as Base } from "@truffle/db/meta";

export type _ = Base._;

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

