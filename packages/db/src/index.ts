const debug = require("debug")("db");

require("source-map-support/register");

const { TruffleDB } = require("./db");
const { ApolloServer } = require("apollo-server");
const { Project } = require("./loaders");

const playgroundServer = config => {
  const { context, schema } = new TruffleDB(config);

  return new ApolloServer({
    tracing: true,
    schema: schema,
    context: context
  });
};

export { TruffleDB, Project, playgroundServer };
