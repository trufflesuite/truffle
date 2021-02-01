const Config = require("@truffle/config");
const { serve } = require("@truffle/db");

const port = 4444;

const server = serve(Config.detect({
  workingDirectory: process.argv[2] || process.cwd()
}));

server.listen({ port }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
