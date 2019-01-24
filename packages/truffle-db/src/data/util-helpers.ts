import { GraphQLNonNull, GraphQLObjectType } from "graphql";
import pascalCase from "pascal-case";

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

// helper function for rawSchemaOperations
export const buildObjForSchema = (schema, opGettersArray) =>
  opGettersArray
    .map(([op, getter]) => ({ [op]: getter(schema) })) // key by operation
    .reduce((a, b) => ({ ...a, ...b }), {}); // combine objects

// helper function for schemaOperations
export const buildOpsObjectForName = (name, opsArray) =>
  opsArray
    .filter(([_, typeDef]) => typeDef) // must have typeDef
    .map(([op, typeDef]) => ({ [op]: prefixType({ typeDef, name }) })) // key by operation
    .reduce((a, b) => ({ ...a, ...b }), {}); // combine objects

// helper function for schemas
export const buildSchemaForName = (name, operationsArray) =>
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
