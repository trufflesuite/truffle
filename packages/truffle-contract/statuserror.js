var TruffleError = require("truffle-error");
var inherits = require("util").inherits;
var web3 = require("web3");

inherits(StatusError, TruffleError);

var defaultGas = 90000;

function StatusError(args, tx, receipt) {
  var message;
  var gasLimit = parseInt(args.gas) || defaultGas;

  if(receipt.gasUsed === gasLimit){

    message = "Transaction: " + tx + " exited with an error (status 0 - invalid opcode).\n" +
      "Please check that the transaction:\n" +
      "    - satisfies all conditions set by Solidity `assert` statements.\n" +
      "    - has enough gas to execute all internal Solidity function calls.\n";

  } else {

    message = "Transaction: " + tx + " exited with an error (status 0 - revert).\n" +
      "Please check that the transaction:\n" +
      "    - satisfies all conditions set by Solidity `require` statements.\n" +
      "    - does not trigger a Solidity `revert` statement.\n";
  }

  StatusError.super_.call(this, message);
  this.tx = tx;
  this.receipt = receipt;
}

module.exports = StatusError;