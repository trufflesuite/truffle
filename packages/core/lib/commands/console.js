const command = {
  command: "console",
  description:
    "Run a console with contract abstractions and commands available",
  builder: {},
  help: {
    usage: "truffle console [--verbose-rpc] [--require|-r <file>]",
    options: [
      {
        option: "--verbose-rpc",
        description:
          "Log communication between Truffle and the Ethereum client."
      },
      {
        option: "--require|-r <file>",
        description: "Preload console environment from required JavaScript " +
          "file. The default export must be an object with named keys that " +
          "will be used\n                    to populate the console environment."
      },
      {
        option: "--require-none",
        description: "Do not load any user-defined JavaScript into the " +
          "console environment. This option takes precedence over --require, " +
          "-r, and\n                    values provided for console.require " +
          "in your project's truffle-config.js."
      }
    ],
    allowedGlobalOptions: ["network", "config"]
  },
  run: async function (options) {
    const Config = require("@truffle/config");
    const Console = require("../console");
    const { Environment } = require("@truffle/environment");

    const config = Config.detect(options);

    // This require a smell?
    const commands = require("./index");
    const excluded = new Set(["console", "init", "watch", "develop"]);

    const consoleCommands = Object.keys(commands).reduce((acc, name) => {
      return !excluded.has(name)
        ? Object.assign(acc, {[name]: commands[name]})
        : acc;
    }, {});

    await Environment.detect(config);
    const c = new Console(consoleCommands, config.with({noAliases: true}));
    return await c.start();
  }
};

module.exports = command;
