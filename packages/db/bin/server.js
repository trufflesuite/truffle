const { serve } = require("@truffle/db");
const Config = require("@truffle/config");

const port = 4444;

const config = Config.detect({
  workingDirectory: process.argv[2] || process.cwd()
});

const server = serve(config);

server.listen({ port }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
