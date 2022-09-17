module.exports = {
  command: "call",
  description: "Call read-only contract function with arguments",
  builder: {
    "url": {
      describe: "Use specified URL for provider",
      type: "string"
    },
    "fetch-external": {
      describe: "Allow calling functions of external contracts",
      alias: "x",
      type: "boolean",
      default: false
    },
    "block-number": {
      describe: "Allows calling functions of a contract from a specific block",
      alias: "b",
      type: "string",
      default: "latest"
    }
  },
  help: {
    usage:
      "truffle call <contract-address>|<contract-name> <function-name>|<function-signature>\n" +
      "                             " + // spacing to align with previous line
      "[<args...>] [--fetch-external|-x] [--network <network>|--url <provider_url>]\n" +
      "                             " + // spacing to align with previous line
      "[--block-number|-b <block_number>]",
    options: [
      {
        option: "<contract-name>",
        description: "The specified contract to be called."
      },
      {
        option: "<contract-address>",
        description: "The address of the contract to be called.\n"
      },
      {
        option: "<function-name>",
        description:
          "The function name inside the specified contract to be called."
      },
      {
        option: "<function-signature>",
        description:
          "The function signature inside the specified contract to be called."
      },
      {
        option: "<args...>",
        description: "List of arguments of the function to be called."
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
      },
      {
        option: "--block-number|-b",
        description: "The block number from which the contract is to be called."
      }
    ],
    allowedGlobalOptions: ["from", "config"]
  }
};
