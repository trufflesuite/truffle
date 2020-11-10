const command = {
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
    ]
  },
  run: async function (options) {
    const Config = require("@truffle/config");
    const TruffleError = require("@truffle/error");
    const WorkflowCompile = require("@truffle/workflow-compile");
    const CodeUtils = require("@truffle/code-utils");

    if (options._.length === 0) {
      throw new TruffleError("Please specify a contract name.");
    }

    const config = Config.detect(options);
    await WorkflowCompile.compileAndSave(config);
    const contractName = options._[0];
    let Contract;
    try {
      Contract = config.resolver.require(contractName);
    } catch (e) {
      throw new TruffleError(
        'Cannot find compiled contract with name "' + contractName + '"'
      );
    }

    let bytecode = Contract.deployedBytecode;
    let numInstructions = Contract.deployedSourceMap.split(";").length;

    if (options.creation) {
      bytecode = Contract.bytecode;
      numInstructions = Contract.sourceMap.split(";").length;
    }
    const opcodes = CodeUtils.parseCode(bytecode, numInstructions);

    const indexLength = (opcodes.length + "").length;

    opcodes.forEach((opcode, index) => {
      let strIndex = index + ":";

      while (strIndex.length < indexLength + 1) {
        strIndex += " ";
      }

      console.log(strIndex + " " + opcode.name + " " + (opcode.pushData || ""));
    });
  }
};

module.exports = command;
