module.exports = {
  command: "console",
  description:
    "Run a console with contract abstractions and commands available",
  builder: {
    url: {
      describe: "Use specified URL for provider",
      type: "string"
    }
  },
  help: {
    usage:
      "truffle console [--verbose-rpc] \n" +
      "                truffle console [--require|-r <file>] \n" +
      "                truffle console [--network <network>] or [--url <provider_url>] \n" +
      "                truffle console",
    options: [
      {
        option: "--url",
        description:
          "Creates a provider using the given url and connects to the network. This can be used outside of a Truffle project."
      },
      {
        option: "--network",
        description:
          "The network to connect to, as specified in the Truffle config."
      },
      {
        option: "--verbose-rpc",
        description:
          "Log communication between Truffle and the Ethereum client."
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
    // The 'network' option is excluded from here and added manually above as a workaround to combine its usage
    // instructions with url to show that they are mutually exclusive.
    allowedGlobalOptions: ["config"]
  }
};
