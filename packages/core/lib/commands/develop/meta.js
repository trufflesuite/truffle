module.exports = {
  command: "develop",
  description: "Open a console with a local development blockchain",
  builder: {
    log: {
      type: "boolean",
      default: false
    }
  },
  help: {
    usage: "truffle develop [--log] [--require|-r <file>]",
    options: [
      {
        option: `--log`,
        description:
          `Start/Connect to a Truffle develop session and log all ` +
          `rpc activity. You will\n                    need to open a ` +
          `different Truffle develop or console session to interact via the repl.`
      },
      {
        option: "--require|-r <file>",
        description:
          "Preload console environment from required JavaScript " +
          "file. The default export must be an object with named keys that " +
          "will be used\n                    to populate the console environment."
      },
      {
        option: "--require-none",
        description:
          "Do not load any user-defined JavaScript into the " +
          "console environment. This option takes precedence over --require, " +
          "-r, and\n                    values provided for console.require " +
          "in your project's truffle-config.js."
      }
    ],
    allowedGlobalOptions: ["config"]
  }
};
