module.exports = {
  command: "call",
  description: "Call read-only contract function with arguments",
  builder: {
    "url": {
      describe: "Connect to a specified provider given via URL",
      type: "string"
    },
    "fetch-external": {
      describe: "Fetch referenced verified contracts as needed",
      alias: "x",
      type: "boolean",
      default: false
    },
    "block-number": {
      describe: "Specify the block for the function to be called in.",
      alias: "b",
      type: "string",
      default: "latest"
    },
    "contract-address": {
      describe: "The contract address to be called",
      type: "string"
    },
    "contract-name": {
      describe: "The contract name to be called",
      type: "string"
    },
    "function-name": {
      describe: "The function name in the specified contract to be called",
      type: "string"
    },
    "function-signature": {
      describe:
        "The full function ABI signature (not selector) in the specified contract to be called",
      type: "string"
    }
  },
  help: {
    usage:
      "truffle call <contract-address>|<contract-name> <function-name>|<function-signature>\n" +
      "                             " + // spacing to align with previous line
      "<arg1> ... <argN> [--fetch-external|-x] [--network <network>|--url <provider_url>]\n" +
      "                             " + // spacing to align with previous line
      "[--block-number|-b <block_number>]",
    options: [
      {
        option: "<contract-name>",
        description: "The contract name to be called."
      },
      {
        option: "<contract-address>",
        description: "The contract address to be called."
      },
      {
        option: "<function-name>",
        description: "The function name in the specified contract to be called."
      },
      {
        option: "<function-signature>",
        description:
          "The full function ABI signature (not selector) in the specified contract to be called."
      },
      {
        option: "<arg1> ... <argN>",
        description:
          "List of arguments to be passed to the function to be called."
      },
      {
        option: "--fetch-external|-x",
        description:
          "Fetches referenced verified contracts as needed.\n" +
          "                    Works only with an external contract address."
      },
      {
        option: "--url",
        description:
          "Connects to a specified provider given via URL, ignoring networks in config."
      },
      {
        option: "--network",
        description:
          "The network to connect to, as specified in the Truffle config."
      },
      {
        option: "--block-number|-b",
        description: "Specifies the block for the function to be called in."
      }
    ],
    allowedGlobalOptions: ["from", "config"]
  }
};
