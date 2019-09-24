const { ApolloServer } = require("apollo-server");

const { TruffleDB } = require("truffle-db");
const Config = require("@truffle/config");

const port = 4444;

const config = Config.detect({
  workingDirectory: process.argv[2] || process.cwd()
});

const db = new TruffleDB({
  contracts_build_directory: config.contracts_build_directory,
  contracts_directory: config.contracts_directory,
  working_directory: config.working_directory
});

const { schema, context } = db;

const server = new ApolloServer({
  tracing: true,
  schema,
  context
});

// This `listen` method launches a web-server.  Existing apps
// can utilize middleware options, which we'll discuss later.
server.listen({ port }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
