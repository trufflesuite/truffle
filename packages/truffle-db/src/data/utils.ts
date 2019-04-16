import { GraphQLSchema, GraphQLNamedType, GraphQLObjectType } from "graphql";
import { mergeSchemas, IResolvers } from "@gnd/graphql-tools";
import {
  buildObjForSchema,
  buildOpsObjectForName,
  buildSchemaForName,
  buildResolverForSubschema,
  buildRootResolvers,
} from "./util-helpers";

export type SchemaMap = {
  [name: string]: GraphQLSchema;
};

export type SchemaOperations = {
  [name: string]: {
    [operation: string]: GraphQLObjectType;
  };
};

export type Schemafiable = string | GraphQLSchema | Array<GraphQLNamedType>;

export type ScopesConfig = {
  subschemas: SchemaMap;
  typeDefs?: Schemafiable[];
  resolvers?: IResolvers;
}

export function scopeSchemas(config: ScopesConfig): GraphQLSchema {
  const {
    subschemas,
    typeDefs,
    resolvers,
  } = config;

  const rawSchemaOperations: SchemaOperations = Object.entries(subschemas)
    .map(([name, schema]) => {
      return {
        [name]: buildObjForSchema(schema), // key by name
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

  const schemas: Schemafiable[] = [
    ...Object.entries(schemaOperations).map(
      ([name, operations]) => {
        const operationsArray = Object.entries(operations); // array of [op, typeDef]
        return new GraphQLSchema(buildSchemaForName(name, operationsArray));
      },
    ),

    ...(typeDefs || [])
  ];

  const subschemaResolvers = Object.entries(subschemas)
    .map(([name, schema]) => {
      const operationsArray = Object.entries(schemaOperations[name]);
      return buildResolverForSubschema(schema, operationsArray);
    })
    .reduce((a, b) => ({ ...a, ...b }), {});

  const rootResolvers = buildRootResolvers(schemaOperations);

  return mergeSchemas({
    schemas,
    resolvers: {
      ...rootResolvers,
      ...subschemaResolvers,
      ...resolvers
    }
  });
}
