import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:types");

import * as graphql from "graphql";

type Data<O, N extends string | keyof O> = string extends N
  ? Partial<O>
  : N extends keyof O
  ? Partial<Pick<O, N>>
  : never;

export type QueryName = keyof DataModel.Query;
export type QueryData<N extends string | QueryName> = Data<DataModel.Query, N>;

export type MutationName = keyof DataModel.Mutation;
export type MutationData<N extends string | MutationName> = Data<
  DataModel.Mutation,
  N
>;

// eventually it might be a good idea to type the known requests+response types
// for now this can just be opaquely a string
type MethodName = string;

export interface GraphQlRequestType<
  N extends QueryName | MutationName | string = string
> {
  graphql: N;
}

export interface Web3RequestType<N extends MethodName | string = string> {
  web3: N;
}

export type RequestType = GraphQlRequestType | Web3RequestType;

export type RequestData<R extends RequestType> = R extends { graphql: infer N }
  ? N extends string
    ? string extends N
      ? Data<DataModel.Query & DataModel.Mutation, N>
      : Data<DataModel.Query, N> | Data<DataModel.Mutation, N>
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

export type LoadRequest<
  R extends RequestType | undefined
> = "graphql" extends keyof R
  ? GraphQlRequest
  : "web3" extends keyof R
  ? Web3Request
  : GraphQlRequest | Web3Request;

export type LoadResponse<R extends RequestType> = R extends { graphql: string }
  ? {
      data: RequestData<R>;
    }
  : {
      id: number;
      jsonrpc: "2.0";
      result: RequestData<R>;
    };

export type Load<
  T = any,
  R extends RequestType | undefined = undefined
> = R extends undefined
  ? Generator<LoadRequest<R>, T, any> // HACK to get TS to play nice, sorry
  : Generator<LoadRequest<R>, T, LoadResponse<R>>;

export type Loader<
  A extends unknown[],
  T = any,
  R extends RequestType | undefined = undefined
> = (...args: A) => Load<T, R>;
