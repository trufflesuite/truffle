const { serve } = require("@truffle/db");

const port = 4444;

const server = serve();

server.listen({ port }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
