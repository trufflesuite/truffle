const { ApolloServer } = require("apollo-server");
const TruffleResolver = require("truffle-resolver");
const { default: TruffleDB, schema } = require("truffle-db");

const port = 4444;

const artifacts = new TruffleResolver({
  working_directory: process.cwd(),
  contracts_build_directory: process.argv[2] || process.cwd()
});

const db = new TruffleDB(artifacts);

const server = new ApolloServer({
  schema,
  context: db.context
});

// This `listen` method launches a web-server.  Existing apps
// can utilize middleware options, which we'll discuss later.
server.listen({ port }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
