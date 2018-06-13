var command = {
  command: 'opcode',
  description: 'Print the compiled opcodes for a given contract',
  builder: {
    all: {
      type: "boolean",
      default: false
    }
  },
  run: function (options, done) {
    var Config = require("truffle-config");
    var TruffleError = require("truffle-error");
    var Contracts = require("truffle-workflow-compile");
    var CodeUtils = require("truffle-code-utils");

    if (options._.length == 0) {
      return done(new TruffleError("Please specify a contract name."));
    }

    var config = Config.detect(options);
    Contracts.compile(config, function(err) {
      if (err) return done(err);

      var contractName = options._[0];
      var Contract;
      try {
        Contract = config.resolver.require(contractName);
      } catch (e) {
        return done(new TruffleError("Cannot find compiled contract with name \"" + contractName + "\""));
      }

      var bytecode = Contract.deployedBytecode;

      if (options.creation) {
        bytecode = Contract.bytecode;
      }

      var opcodes = CodeUtils.parseCode(bytecode);

      var indexLength = ((opcodes.length) + "").length;

      opcodes.forEach(function(opcode, index) {
        var strIndex = index + ":";

        while (strIndex.length < indexLength + 1) {
          strIndex += " ";
        }

        console.log(strIndex + " " + opcode.name + " " + (opcode.pushData || ""));
      });
    });
  }
}

module.exports = command;
