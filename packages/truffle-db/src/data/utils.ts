import { GraphQLSchema, GraphQLObjectType } from "graphql";
import { mergeSchemas } from "graphql-tools";
import {
  buildObjForSchema,
  buildOpsObjectForName,
  buildSchemaForName,
} from "./util-helpers";

export type SchemaMap = {
  [name: string]: GraphQLSchema;
};

export type SchemaOperations = {
  [name: string]: {
    [operation: string]: GraphQLObjectType;
  };
};

export function scopeSchemas(schemaMap: SchemaMap): GraphQLSchema {
  const operationGetters = {
    query: (schema: GraphQLSchema) => schema.getQueryType(),
    mutation: (schema: GraphQLSchema) => schema.getMutationType(),
  };

  const rawSchemaOperations: SchemaOperations = Object.entries(schemaMap)
    .map(([name, schema]) => {
      const opGettersArray = Object.entries(operationGetters); // array of [op, getter]
      return {
        [name]: buildObjForSchema(schema, opGettersArray), // key by name
      };
    })
    .reduce((a, b) => ({ ...a, ...b }), {}); // combine objects

  const schemaOperations: SchemaOperations = Object.entries(rawSchemaOperations)
    .map(([name, operations]) => {
      const opsArray = Object.entries(operations); // array of [op, typeDef]
      return {
        [name]: buildOpsObjectForName(name, opsArray), // key by name
      };
    })
    .reduce((a, b) => ({ ...a, ...b }), {}); // combine objects

  const schemas: GraphQLSchema[] = Object.entries(schemaOperations).map(
    ([name, operations]) => {
      const operationsArray = Object.entries(operations); // array of [op, typeDef]
      return new GraphQLSchema(buildSchemaForName(name, operationsArray));
    },
  );

  return mergeSchemas({ schemas });
}
