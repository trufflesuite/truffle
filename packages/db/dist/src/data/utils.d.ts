import { GraphQLSchema, GraphQLNamedType, GraphQLObjectType } from "graphql";
import { IResolvers } from "@gnd/graphql-tools";
export declare type SchemaMap = {
  [name: string]: GraphQLSchema;
};
export declare type SchemaOperations = {
  [name: string]: {
    [operation: string]: GraphQLObjectType;
  };
};
export declare type Schemafiable =
  | string
  | GraphQLSchema
  | Array<GraphQLNamedType>;
export declare type ScopesConfig = {
  subschemas: SchemaMap;
  typeDefs?: Schemafiable[];
  resolvers?: IResolvers;
};
export declare function scopeSchemas(config: ScopesConfig): GraphQLSchema;
