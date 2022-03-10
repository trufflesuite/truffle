module.exports = {
  command: "migrate",
  description: "Run migrations to deploy contracts",
  builder: {
    "reset": {
      type: "boolean",
      default: false
    },
    "compile-all": {
      describe: "Recompile all contracts",
      type: "boolean",
      default: false
    },
    "compile-none": {
      describe: "Do not compile contracts",
      type: "boolean",
      default: false
    },
    "--verbose-rpc": {
      describe: "Log communication between Truffle and the Ethereum client.",
      type: "boolean",
      default: false
    },
    "dry-run": {
      describe: "Run migrations against an in-memory fork, for testing",
      type: "boolean",
      default: false
    },
    "skip-dry-run": {
      describe: "Skip the test or 'dry run' migrations",
      type: "boolean",
      default: false
    },
    "f": {
      describe: "Specify a migration number to run from",
      type: "number"
    },
    "to": {
      describe: "Specify a migration number to run to",
      type: "number"
    },
    "interactive": {
      describe: "Manually authorize deployments after seeing a preview",
      type: "boolean",
      default: false
    },
    "describe-json": {
      describe: "Adds extra verbosity to the status of an ongoing migration",
      type: "boolean",
      default: false
    },
    "save": {
      describe: "Specify whether the migration will save on chain",
      type: "boolean",
      default: true,
      hidden: true
    }
  },
  help: {
    usage:
      "truffle migrate [--reset] [--f <number>] [--to <number>]\n" +
      "                                " + // spacing to align with previous line
      "[--compile-all] [--compile-none] [--verbose-rpc] [--interactive]\n" +
      "                                " + // spacing to align with previous line
      "[--skip-dry-run] [--describe-json] [--dry-run] [--show-plan]",
    options: [
      {
        option: "--reset",
        description:
          "Run all migrations from the beginning, instead of running from the last " +
          "completed migration."
      },
      {
        option: "--f <number>",
        description:
          "Run contracts from a specific migration. The number refers to the prefix of " +
          "the migration file."
      },
      {
        option: "--to <number>",
        description:
          "Run contracts to a specific migration. The number refers to the prefix of the migration file."
      },
      {
        option: "--compile-all",
        description:
          "Compile all contracts instead of intelligently choosing which contracts need to " +
          "be compiled."
      },
      {
        option: "--compile-none",
        description: "Do not compile any contracts before migrating."
      },
      {
        option: "--verbose-rpc",
        description:
          "Log communication between Truffle and the Ethereum client."
      },
      {
        option: "--interactive",
        description:
          "Prompt to confirm that the user wants to proceed after the dry run."
      },
      {
        option: "--dry-run",
        description: "Only perform a test or 'dry run' migration."
      },
      {
        option: "--skip-dry-run",
        description: "Do not run a test or 'dry run' migration."
      },
      {
        option: "--describe-json",
        description:
          "Adds extra verbosity to the status of an ongoing migration"
      },
      {
        option: "--save",
        description: "Specify whether the migration will save on chain",
        hidden: true
      }
    ],
    allowedGlobalOptions: ["network", "config", "quiet"]
  }
};
