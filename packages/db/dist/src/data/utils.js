"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scopeSchemas = void 0;
const graphql_1 = require("graphql");
const graphql_tools_1 = require("@gnd/graphql-tools");
const util_helpers_1 = require("./util-helpers");
function scopeSchemas(config) {
  const { subschemas, typeDefs, resolvers } = config;
  const rawSchemaOperations = Object.entries(subschemas)
    .map(([name, schema]) => {
      return {
        [name]: util_helpers_1.buildObjForSchema(schema) // key by name
      };
    })
    .reduce((a, b) => Object.assign(Object.assign({}, a), b), {}); // combine objects
  const schemaOperations = Object.entries(rawSchemaOperations)
    .map(([name, operations]) => {
      const opsArray = Object.entries(operations); // array of [op, typeDef]
      return {
        [name]: util_helpers_1.buildOpsObjectForName(name, opsArray) // key by name
      };
    })
    .reduce((a, b) => Object.assign(Object.assign({}, a), b), {}); // combine objects
  const schemas = [
    ...Object.entries(schemaOperations).map(([name, operations]) => {
      const operationsArray = Object.entries(operations); // array of [op, typeDef]
      return new graphql_1.GraphQLSchema(
        util_helpers_1.buildSchemaForName(name, operationsArray)
      );
    }),
    ...(typeDefs || [])
  ];
  const subschemaResolvers = Object.entries(subschemas)
    .map(([name, schema]) => {
      const operationsArray = Object.entries(schemaOperations[name]);
      return util_helpers_1.buildResolverForSubschema(schema, operationsArray);
    })
    .reduce((a, b) => Object.assign(Object.assign({}, a), b), {});
  const rootResolvers = util_helpers_1.buildRootResolvers(schemaOperations);
  return graphql_tools_1.mergeSchemas({
    schemas,
    resolvers: Object.assign(
      Object.assign(Object.assign({}, rootResolvers), subschemaResolvers),
      resolvers
    )
  });
}
exports.scopeSchemas = scopeSchemas;
//# sourceMappingURL=utils.js.map
