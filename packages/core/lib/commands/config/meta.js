module.exports = {
  command: "config",
  description: "Set user-level configuration options",
  help: {
    usage:
      "truffle config [--enable-analytics|--disable-analytics] [<list>] [[<get|set> <key>] [<value-for-set>]]",
    options: [
      {
        option: "--enable-analytics",
        description: "Enable Truffle to send usage data to Google Analytics."
      },
      {
        option: "--disable-analytics",
        description:
          "Disable Truffle's ability to send usage data to Google Analytics."
      },
      {
        option: "get",
        description: "Get a Truffle config option value."
      },
      {
        option: "set",
        description: "Set a Truffle config option value."
      },
      {
        option: "list",
        description: "List all Truffle config values."
      }
    ],
    allowedGlobalOptions: []
  },
  builder: {
    _: {
      type: "string"
    }
  }
};
