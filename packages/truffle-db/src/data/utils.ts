import { GraphQLSchema, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { mergeSchemas } from "graphql-tools";
import pascalCase from "pascal-case";

export type SchemaMap = {
  [name: string]: GraphQLSchema;
};

export type SchemaOperations = {
  [name: string]: {
    [operation: string]: GraphQLObjectType;
  };
};

export function prefixType({ typeDef, name }): GraphQLObjectType {
  return Object.assign(
    // assign prototype
    Object.create(typeDef),

    // assign all fields
    typeDef,

    // override name
    {
      name: `${pascalCase(name)}${typeDef.name}`,
    },
  );
}

export function scopeSchemas(schemaMap: SchemaMap): GraphQLSchema {
  const operationGetters = {
    query: (schema: GraphQLSchema) => schema.getQueryType(),
    mutation: (schema: GraphQLSchema) => schema.getMutationType(),
  };

  // helper function for rawSchemaOperations
  const buildObjForSchema = (schema, opGettersArray) =>
    opGettersArray
      .map(([op, getter]) => ({ [op]: getter(schema) })) // key by operation
      .reduce((a, b) => ({ ...a, ...b }), {}); // combine objects

  const rawSchemaOperations: SchemaOperations = Object.entries(schemaMap)
    .map(([name, schema]) => {
      const opGettersArray = Object.entries(operationGetters); // array of [op, getter]
      return {
        [name]: buildObjForSchema(schema, opGettersArray), // key by name
      };
    })
    .reduce((a, b) => ({ ...a, ...b }), {}); // combine objects

  // helper function for schemaOperations
  const buildOpsObjectForName = (name, opsArray) =>
    opsArray
      .filter(([_, typeDef]) => typeDef) // must have typeDef
      .map(([op, typeDef]) => ({ [op]: prefixType({ typeDef, name }) })) // key by operation
      .reduce((a, b) => ({ ...a, ...b }), {}); // combine objects

  const schemaOperations: SchemaOperations = Object.entries(rawSchemaOperations)
    .map(([name, operations]) => {
      const opsArray = Object.entries(operations); // array of [op, typeDef]
      return {
        [name]: buildOpsObjectForName(name, opsArray), // key by name
      };
    })
    .reduce((a, b) => ({ ...a, ...b }), {}); // combine objects

  // helper function for schemas
  const buildSchemaForName = (name, operationsArray) =>
    operationsArray
      .map(([operation, typeDef]) => ({
        [operation]: new GraphQLObjectType({
          name: pascalCase(operation),
          fields: {
            [name]: {
              type: new GraphQLNonNull(typeDef),
              resolve: () => true,
            },
          },
        }),
      }))
      .reduce((a, b) => ({ ...a, ...b }), {}); // combine objects

  const schemas: GraphQLSchema[] = Object.entries(schemaOperations).map(
    ([name, operations]) => {
      const operationsArray = Object.entries(operations); // array of [op, typeDef]
      return new GraphQLSchema(buildSchemaForName(name, operationsArray));
    },
  );

  return mergeSchemas({ schemas });
}
