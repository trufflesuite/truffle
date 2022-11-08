module.exports = {
  command: "call",
  description: "Call read-only contract function with arguments",
  builder: {
    "url": {
      describe: "Use specified URL for ethereum provider",
      type: "string"
    },
    "fetch-external": {
      describe: "Fetch referenced verified contracts as needed",
      alias: "x",
      type: "boolean",
      default: false
    },
    "block-number": {
      describe: "Calls specified contract function at specific block",
      alias: "b",
      type: "integer",
      default: "latest"
    },
    "contract-address": {
      describe: "The contract address to be called",
      type: "string"
    },
    "contract-name": {
      describe: "The contract name to be called",
      type: "string"
    }
  },
  help: {
    usage:
      "truffle call <contract-address>|<contract-name> <function-name>|<function-signature>\n" +
      "                             " + // spacing to align with previous line
      "[<arg>...] [--fetch-external|-x] [--network <network>|--url <provider_url>]\n" +
      "                             " + // spacing to align with previous line
      "[--block-number|-b <block_number>]",
    options: [
      {
        option: "<contract-name>",
        description: "The contract name to be called."
      },
      {
        option: "<contract-address>",
        description: "The contract address to be called.\n"
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
        option: "<arg>...",
        description: "List of arguments of the function to be called."
      },
      {
        option: "--fetch-external|-x",
        description: "Fetch referenced verified contracts as needed."
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
