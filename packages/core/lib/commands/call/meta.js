module.exports = {
  command: "call",
  description: "Call read-only contract function with arguments",
  builder: {},
  help: {
    usage:
      "truffle call <contract-name> <function-name> [<function-args...>] [--network=<network-name>",
    usage:
      "truffle call <contract-name> <function-name> [<args...>]\n" +
      "                                " + // spacing to align with previous line
      "[--network=<network-name>] [--from=<account>]",
    options: [],
    allowedGlobalOptions: ["from", "network", "config"]
  }
};
