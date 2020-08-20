"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildResolverForSubschema = exports.buildRootResolvers = exports.buildSchemaForName = exports.buildOpsObjectForName = exports.buildObjForSchema = exports.prefixType = void 0;
const graphql_1 = require("graphql");
const pascal_case_1 = __importDefault(require("pascal-case"));
function prefixType({ typeDef, name }) {
  return Object.assign(
    // assign prototype
    Object.create(typeDef),
    // assign all fields
    typeDef,
    // override name
    {
      name: `${pascal_case_1.default(name)}${typeDef.name}`
    }
  );
}
exports.prefixType = prefixType;
const operationGetters = {
  query: schema => schema.getQueryType(),
  mutation: schema => schema.getMutationType()
};
// helper function for rawSchemaOperations
exports.buildObjForSchema = schema =>
  Object.entries(operationGetters)
    .map(([op, getter]) => ({ [op]: getter(schema) })) // key by operation
    .reduce((a, b) => Object.assign(Object.assign({}, a), b), {}); // combine objects
// helper function for schemaOperations
exports.buildOpsObjectForName = (name, opsArray) =>
  opsArray
    .filter(([_, typeDef]) => typeDef) // must have typeDef
    .map(([op, typeDef]) => ({ [op]: prefixType({ typeDef, name }) })) // key by operation
    .reduce((a, b) => Object.assign(Object.assign({}, a), b), {}); // combine objects
// helper function for schemas
exports.buildSchemaForName = (name, operationsArray) =>
  operationsArray
    .map(([operation, typeDef]) => ({
      [operation]: new graphql_1.GraphQLObjectType({
        name: pascal_case_1.default(operation),
        fields: {
          [name]: {
            type: new graphql_1.GraphQLNonNull(typeDef),
            resolve: () => true
          }
        }
      })
    }))
    .reduce((a, b) => Object.assign(Object.assign({}, a), b), {}); // combine objects
exports.buildRootResolvers = schemaOperations =>
  Object.entries(schemaOperations).reduce((accumulator, [name, operations]) => {
    return Object.assign(
      Object.assign({}, accumulator),
      Object.keys(operations)
        .map(operation =>
          Object.assign(Object.assign({}, accumulator[operation] || {}), {
            [pascal_case_1.default(operation)]: {
              [name]: () => true
            }
          })
        )
        .reduce((a, b) => Object.assign(Object.assign({}, a), b))
    );
  }, {});
exports.buildResolverForSubschema = (schema, operationsArray) =>
  operationsArray
    .map(([operation, typeDef]) => ({
      [typeDef.name]: Object.keys(
        operationGetters[operation](schema).getFields()
      )
        .map(fieldName => ({
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
        .reduce((a, b) => Object.assign(Object.assign({}, a), b), {})
    }))
    .reduce((a, b) => Object.assign(Object.assign({}, a), b), {});
//# sourceMappingURL=util-helpers.js.map
