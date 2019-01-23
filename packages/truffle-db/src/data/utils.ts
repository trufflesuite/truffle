import { GraphQLSchema, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { mergeSchemas } from "graphql-tools";
import pascalCase from "pascal-case";

export type SchemaMap = {
  [name: string]: GraphQLSchema
};

export type SchemaOperations = {
  [name: string]: {
    [operation: string]: GraphQLObjectType
  }
};

export function prefixType ({ typeDef, name }): GraphQLObjectType {
  return Object.assign(
    // assign prototype
    Object.create(typeDef),

    // assign all fields
    typeDef,

    // override name
    {
      name: `${pascalCase(name)}${typeDef.name}`
    }
  );
}

export function scopeSchemas(schemaMap: SchemaMap): GraphQLSchema {
  const operationGetters = {
    "query": (schema: GraphQLSchema) => schema.getQueryType(),
    "mutation": (schema: GraphQLSchema) => schema.getMutationType()
  };

  const rawSchemaOperations: SchemaOperations
  = Object.assign(
    {}, ...Object.entries(schemaMap).map(
      // for each named schema
      ([ name, schema ]) => ({
        // collect map of named operations
        [name]: Object.assign(
          // by applying named operation getters
          {}, ...Object.entries(operationGetters).map(
            ([ operation, getter ]) => ({
              [operation]: getter(schema)
            })
          )
        )
      })
    )
  );

  const schemaOperations: SchemaOperations
  = Object.assign(
    // for each named set of operations
    {}, ...Object.entries(rawSchemaOperations).map(
      ([ name, operations ]) => ({
        // collect transformed map of operations
        [name]: Object.assign(
          {}, ...Object.entries(operations)
            // by filering for undefined (e.g. schemas without Mutation)
            .filter( ([ _, typeDef ]) => typeDef )
            // and prefixing type definition name
            .map(
              ([ operation, typeDef ]) => ({
                [operation]: prefixType({ typeDef, name })
              })
            )
        )
      })
    )
  );

  const schemas: GraphQLSchema[]
  = Object.entries(schemaOperations).map(
    // named field definition
    ([ name, operations ]) => new GraphQLSchema(
      Object.assign(
        {}, ...Object.entries(operations).map(
          ([ operation, typeDef ]) => ({
            // operation map
            [operation]: new GraphQLObjectType({
              name: pascalCase(operation),
              fields: {
                [name]: {
                  type: new GraphQLNonNull(typeDef),
                  resolve: () => true
                }
              }
            })
          })
        )
      )
    )
  );

  return mergeSchemas({ schemas });
}
