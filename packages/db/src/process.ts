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

export interface ResourceProcessors {
  load: <N extends CollectionName>(
    collectionName: N,
    inputs: Input<N>[]
  ) => Process<IdObject<N>[]>;

  get: <N extends CollectionName>(
    collectionName: N,
    id: string,
    document: graphql.DocumentNode
  ) => Process<Resource<N>>;

  find: <N extends CollectionName>(
    collectionName: N,
    ids: string[],
    document: graphql.DocumentNode
  ) => Process<Resource<N>[]>;

  all: <N extends CollectionName>(
    collectionName: N,
    document: graphql.DocumentNode
  ) => Process<Resource<N>[]>;
}

export const resources: ResourceProcessors = System.resources;

export namespace Run {
  export const forDb = System.forDb;
}
