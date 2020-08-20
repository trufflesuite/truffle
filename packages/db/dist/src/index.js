"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playgroundServer = exports.TruffleDB = void 0;
require("source-map-support/register");
require("module-alias/register");
const path = require("path");
const moduleAlias = require("module-alias");
moduleAlias.addAlias("@truffle/db", path.join(__dirname));
const { TruffleDB } = require("./db");
exports.TruffleDB = TruffleDB;
const { ApolloServer } = require("apollo-server");
const playgroundServer = config => {
  const { context, schema } = new TruffleDB({
    contracts_build_directory: config.contracts_build_directory,
    contracts_directory: config.contracts_directory,
    working_directory: config.working_directory
  });
  return new ApolloServer({
    tracing: true,
    schema: schema,
    context: context
  });
};
exports.playgroundServer = playgroundServer;
//# sourceMappingURL=index.js.map
