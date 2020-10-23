import * as graphql from "graphql";

import { CompiledContract } from "@truffle/compile-common";
import { IdObject } from "@truffle/db/meta";

export interface CompilationData {
  compiler: {
    name: string;
    version: string;
  };
  sources: SourceData[]; // ordered by index
}

export interface SourceData {
  index: number;
  input: DataModel.SourceInput;
  contracts: CompiledContract[];
}

export interface LoadedSources {
  [sourcePath: string]: IdObject<DataModel.Source>;
}

// we track loaded bytecodes using the same structure as CompilationData:
// - order sources
// - order contracts for each source
// - capture bytecodes for each contract
export interface LoadedBytecodes {
  sources: {
    contracts: {
      createBytecode: IdObject<DataModel.Bytecode>;
      callBytecode: IdObject<DataModel.Bytecode>;
    }[];
  }[];
}

export interface LoadRequest<_N extends RequestName | string> {
  request: string | graphql.DocumentNode; // GraphQL request
  variables: {
    [name: string]: any;
  };
}

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

export type RequestName = QueryName | MutationName;
export type RequestData<N extends RequestName | string> = string extends N
  ? Data<DataModel.Query & DataModel.Mutation, N>
  : Data<DataModel.Query, N> | Data<DataModel.Mutation, N>;

export interface LoadResponse<N extends RequestName | string> {
  data: RequestData<N>;
}

export type Load<
  T = any,
  N extends RequestName | string = string
> = string extends N
  ? Generator<any, T, any> // HACK to get TS to play nice, sorry
  : Generator<LoadRequest<N>, T, LoadResponse<N>>;

export type Loader<
  A extends unknown[],
  T = any,
  N extends RequestName | string = string
> = (...args: A) => Load<T, N>;
