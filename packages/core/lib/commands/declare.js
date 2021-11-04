const command = {
  command: "declare",
  description: "Run deployments based on declarative yaml file",
  builder: {
    "filepath": {
      describe: "Path to declarative file",
      type: "string",
    }
  },
  help: {
    usage: "truffle declare --filepath <string>",
    options: [],
    allowedGlobalOptions: ["config"]
  },
  run: async function (filepath, options = []) {
    const Solver = require("@truffle/solver");

    const util = require("util");
    console.log("solver? " + util.inspect(Solver));
    const Config = require("@truffle/config");

    // const conf = Config.detect(options);

    await Solver.Solver.orchestrate(filepath);
  }
};

module.exports = command;
