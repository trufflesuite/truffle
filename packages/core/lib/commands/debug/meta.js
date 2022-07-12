const OS = require("os");

module.exports = {
  command: "debug",
  description: "Interactively debug any transaction on the blockchain",
  builder: {
    url: {
      describe: "Use specified URL for provider",
      type: "string"
    },
    _: {
      type: "string"
    },
    "fetch-external": {
      describe: "Allow debugging of external contracts",
      alias: "x",
      type: "boolean",
      default: false
    },
    "no-fetch-storage": {
      describe: "Do not fetch storage not touched in the transaction",
      alias: "z",
      type: "boolean",
      default: false
    },
    "compile-tests": {
      describe: "Allow debugging of Solidity test contracts",
      type: "boolean",
      default: false
    },
    "compile-all": {
      describe: "Force debugger to compile all contracts for extra safety",
      type: "boolean",
      default: false
    },
    "compile-none": {
      describe: "Force debugger to skip compilation (dangerous!)",
      type: "boolean",
      default: false
    },
    "no-ens": {
      describe: "Turns off ens reverse resolution",
      type: "boolean",
      default: false
    },
    "registry": {
      describe: "Allows setting a custom address for the ENS registry",
      type: "string"
    }
  },
  help: {
    usage:
      "truffle debug [<transaction_hash>] [--fetch-external|-x] [--no-fetch-storage|-z]" +
      OS.EOL +
      "                             [--network <network>|--url <provider_url>]" +
      OS.EOL +
      "                             [--no-ens|--registry <registry_address>]" +
      OS.EOL +
      "                             [--compile-tests|--compile-all|--compile-none]",
    options: [
      {
        option: "<transaction_hash>",
        description:
          "Transaction ID to use for debugging.  Mandatory if --fetch-external is passed."
      },
      {
        option: "--fetch-external|-x",
        description:
          "Allows debugging of external contracts with verified sources."
      },
      {
        option: "--no-fetch-storage|-z",
        description:
          "Disables storage view for storage not touched in transaction; useful for contracts with lots of storage."
      },
      {
        option: "--network",
        description:
          "The network to connect to, as specified in the Truffle config."
      },
      {
        option: "--url",
        description:
          "Connects to a specified provider given via URL, ignoring networks in config. This option allows using the debugger outside of a Truffle project."
      },
      {
        option: "--no-ens",
        description: "Disables ENS reverse resolution when decoding addresses."
      },
      {
        option: "--registry",
        description:
          "Allows setting a custom registry for performing reverse ENS resolution, or setting such a registry at all on lesser-known networks."
      },
      {
        option: "--compile-tests",
        description:
          "Allows debugging of Solidity test contracts from the test directory.  Implies --compile-all."
      },
      {
        option: "--compile-all",
        description:
          "Forces the debugger to recompile all contracts even if it detects that it can use the artifacts."
      },
      {
        option: "--compile-none",
        description:
          "Forces the debugger to use artifacts even if it detects a problem.  Dangerous; may cause errors."
      }
    ],
    allowedGlobalOptions: ["config"]
    //although network is an allowed global option, it isn't listed here because listing it here would cause
    //it to be tacked on to the end of usage, which would prevent us from doing the thing above where we
    //combine its usage instructions with url to show that they're mutually exclusive.  so as a workaround
    //we've excluded network from here, and added it manually above.
  }
};
