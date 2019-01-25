import { GraphQLSchema, GraphQLNonNull, GraphQLObjectType } from "graphql";
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

const operationGetters = {
  query: (schema: GraphQLSchema) => schema.getQueryType(),
  mutation: (schema: GraphQLSchema) => schema.getMutationType(),
};

// helper function for rawSchemaOperations
export const buildObjForSchema = (schema) =>
  Object.entries(operationGetters)
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
            resolve: () => true
          },
        },
      }),
    }))
    .reduce((a, b) => ({ ...a, ...b }), {}); // combine objects

export const buildRootResolvers = (schemaOperations) =>
  Object.entries(schemaOperations)
    .reduce((accumulator, [name, operations]) => {
      return {
        ...accumulator,

        ...Object.keys(operations)
          .map((operation) => ({
            ...(accumulator[operation] || {}),

            [pascalCase(operation)]: {
              [name]: () => true
            }
          }))
          .reduce((a, b) => ({ ...a, ...b }))
      };
    }, {});


export const buildResolverForSubschema = (schema, operationsArray) =>
  operationsArray
    .map(([operation, typeDef]) => ({
      [typeDef.name]:
        Object.keys(operationGetters[operation](schema).getFields())
          .map((fieldName) => ({
            [fieldName]: {
              resolve: (_, args, context, info) =>
                info.mergeInfo.delegateToSchema({
                  schema,
                  operation,
                  fieldName,
                  args,
                  context,
                  info
                })
            }
          }))
          .reduce((a, b) => ({ ...a, ...b }), {})
    }))
    .reduce((a, b) => ({ ...a, ...b }), {});
