module.exports = {
  command: "call",
  description: "Call read-only contract function with arguments",
  builder: {
    "url": {
      describe: "Use specified URL for provider",
      type: "string"
    },
    "fetch-external": {
      describe: "Allow debugging of external contracts",
      alias: "x",
      type: "boolean",
      default: false
    }
  },
  help: {
    usage:
      "truffle call [<contract-name>] [<function-name>] [<args...>]\n" +
      "                             " + // spacing to align with previous line
      "[--fetch-external|-x] [--network <network>|--url <provider_url>]\n" +
      "                             ",
    options: [
      {
        option: "<contract-name>",
        description: "The specified contract"
      },
      {
        option: "<function-name>",
        description: "The function inside the specified contract to be called"
      },
      {
        option: "<args...>",
        description: "List of arguments of the function to be called"
      },
      {
        option: "--fetch-external|-x",
        description:
          "Allows calling functions of external contracts with verified sources."
      },
      {
        option: "--url",
        description:
          "Creates a provider using the given url and connects to the network.\n" +
          "                    This can be used outside of a Truffle project."
      },
      {
        option: "--network",
        description:
          "The network to connect to, as specified in the Truffle config."
      }
    ],
    allowedGlobalOptions: ["from", "config"]
  }
};
