const serveCommand = require("./commands/serve");
const queryCommand = require("./commands/query");

module.exports = async function (args) {
  const [subCommand] = args._;
  switch (subCommand) {
    case "serve":
      await serveCommand.run(args);
      break;

    case "query":
      await queryCommand.run(args);
      break;

    default:
      console.log(`Unknown truffle db command: ${subCommand}`);
  }
};
