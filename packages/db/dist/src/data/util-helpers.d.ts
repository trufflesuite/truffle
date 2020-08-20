import { GraphQLObjectType } from "graphql";
export declare function prefixType({
  typeDef,
  name
}: {
  typeDef: any;
  name: any;
}): GraphQLObjectType;
export declare const buildObjForSchema: (
  schema: any
) => {
  [x: string]: GraphQLObjectType;
};
export declare const buildOpsObjectForName: (name: any, opsArray: any) => any;
export declare const buildSchemaForName: (
  name: any,
  operationsArray: any
) => any;
export declare const buildRootResolvers: (schemaOperations: any) => any;
export declare const buildResolverForSubschema: (
  schema: any,
  operationsArray: any
) => any;
