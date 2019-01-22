const { ApolloServer } = require("apollo-server");

const { TruffleDB } = require("truffle-db");

const port = 4444;

const db = new TruffleDB({
  contracts_build_directory: process.argv[2] || process.cwd()
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
