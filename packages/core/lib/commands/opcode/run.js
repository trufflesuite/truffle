module.exports = async function (options) {
  const Config = require("@truffle/config");
  const TruffleError = require("@truffle/error");
  const WorkflowCompile = require("@truffle/workflow-compile");
  const CodeUtils = require("@truffle/code-utils");
  const { Conversion } = require("@truffle/codec");

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
  const opcodes = CodeUtils.parseCode(bytecode, {
    maxInstructionCount: numInstructions
  });

  if (opcodes.length === 0) {
    console.log(
      "Contract has no bytecode. Please check to make sure it's not an `abstract contract` or an `interface`."
    );
    return;
  }

  const lastPCByteLength = Conversion.toBytes(
    opcodes[opcodes.length - 1].pc
  ).byteLength;

  opcodes.forEach(opcode => {
    console.log(
      Conversion.toHexString(opcode.pc, lastPCByteLength) + ":",
      opcode.name,
      opcode.pushData || ""
    );
  });
};
