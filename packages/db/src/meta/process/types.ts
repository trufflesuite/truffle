import { logger } from "@truffle/db/logger";
const debug = logger("db:process:types");

import * as graphql from "graphql";

import {
  Collections,
  CollectionName,
  CollectionProperty,
  MutableCollectionName,
  Resource,
  MutationPayload
} from "@truffle/db/meta/collections";

export type Definitions<C extends Collections> = {
  [N in CollectionName<C>]: Definition<C, N>;
};

export type Definition<
  C extends Collections,
  N extends CollectionName<C>
> = N extends MutableCollectionName<C>
  ? { mutable: true }
  : { mutable?: false };

type Data<O, N extends string | keyof O> = string extends N
  ? Partial<O>
  : N extends keyof O
  ? Partial<Pick<O, N>>
  : never;

// eventually it might be a good idea to type the known requests+response types
// for now this can just be opaquely a string
type MethodName = string;

export interface GraphQlRequestType<
  C extends Collections,
  N extends QueryName<C> | MutationName<C> | string = string
> {
  graphql: N;
}

export interface Web3RequestType<
  _C extends Collections,
  N extends MethodName | string = string
> {
  web3: N | string;
}

export type RequestType<C extends Collections> =
  | GraphQlRequestType<C>
  | Web3RequestType<C>;

export type RequestData<
  C extends Collections,
  R extends RequestType<C>
> = R extends { graphql: infer N }
  ? N extends string
    ? string extends N
      ? Data<Query<C> & Mutation<C>, N>
      : Data<Query<C>, N> | Data<Mutation<C>, N>
    : never // shouldn't happen
  : any;

export interface GraphQlRequest {
  type: "graphql";
  request: string | graphql.DocumentNode; // GraphQL request
  variables: {
    [name: string]: any;
  };
}

export interface Web3Request {
  type: "web3";
  method: string;
  params?: any[];
}

export type ProcessRequest<
  C extends Collections,
  R extends RequestType<C> | undefined
> = "graphql" extends keyof R
  ? GraphQlRequest
  : "web3" extends keyof R
  ? Web3Request
  : GraphQlRequest | Web3Request;

export type ProcessResponse<
  C extends Collections,
  R extends RequestType<C>
> = R extends { graphql: string }
  ? {
      data: RequestData<C, R>;
    }
  : {
      id: number;
      jsonrpc: "2.0";
      result: RequestData<C, R>;
    };

export type Process<
  C extends Collections,
  T = any,
  R extends RequestType<C> | undefined = undefined
> = R extends undefined
  ? Generator<ProcessRequest<C, R>, T, any> // HACK to get TS to play nice, sorry
  : Generator<ProcessRequest<C, R>, T, ProcessResponse<C, R>>;

export type Processor<
  C extends Collections,
  A extends unknown[],
  T = any,
  R extends RequestType<C> | undefined = undefined
> = (...args: A) => Process<C, T, R>;

export type QueryName<
  C extends Collections,
  N extends CollectionName<C> = CollectionName<C>
> = {
  [K in N]:
    | CollectionProperty<"names", C, K>["resource"]
    | CollectionProperty<"names", C, K>["resources"];
}[N];

export type Query<C extends Collections> = {
  [N in CollectionName<C>]: {
    [Q in QueryName<C, N>]: Q extends CollectionProperty<
      "names",
      C,
      N
    >["resource"]
      ? Resource<C, N> | null
      : Q extends CollectionProperty<"names", C, N>["resources"]
      ? (Resource<C, N> | null)[] | null
      : never;
  };
}[CollectionName<C>];

export type MutationName<
  C extends Collections,
  N extends CollectionName<C> = CollectionName<C>
> = {
  [K in N]: CollectionProperty<"names", C, K>["resourcesMutate"];
}[N];

export type Mutation<C extends Collections> = {
  [N in CollectionName<C>]: {
    [M in MutationName<C, N>]: MutationPayload<C, N> | null;
  };
}[CollectionName<C>];
