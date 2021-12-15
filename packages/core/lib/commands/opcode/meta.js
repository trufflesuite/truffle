module.exports = {
  command: "opcode",
  description: "Print the compiled opcodes for a given contract",
  builder: {
    all: {
      type: "boolean",
      default: false
    }
  },
  help: {
    usage: "truffle opcode <contract_name>",
    options: [
      {
        option: "<contract_name>",
        description:
          "Name of the contract to print opcodes for. Must be a contract name, not a file name. (required)"
      }
    ],
    allowedGlobalOptions: []
  }
};
