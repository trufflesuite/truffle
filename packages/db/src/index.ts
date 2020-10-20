require("source-map-support/register");

const { TruffleDB } = require("./db");
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

export { TruffleDB, playgroundServer };
