var TruffleError = require("truffle-error");
var inherits = require("util").inherits;
var BN = require("bn.js");

inherits(StatusError, TruffleError);

var defaultGas = 90000;

function createBN(n) {
  if (typeof n === "string" && n.startsWith("0x")) {
    n = n.slice(2);
    return new BN(n, "hex");
  } else {
    return new BN(n);
  }
}

function StatusError(args, tx, receipt, reason) {
  var message;
  var gasLimit = args.gas || defaultGas;
  var reasonString = "";

  if (reason) reasonString = `Reason given: ${reason}.`;

  if (createBN(receipt.gasUsed).eq(createBN(gasLimit))) {
    message =
      "Transaction: " +
      tx +
      " exited with an error (status 0) after consuming all gas.\n" +
      "     Please check that the transaction:\n" +
      "     - satisfies all conditions set by Solidity `assert` statements.\n" +
      "     - has enough gas to execute the full transaction.\n" +
      "     - does not trigger an invalid opcode by other means (ex: accessing an array out of bounds).";
  } else {
    message =
      `Transaction: ${tx} exited with an error (status 0). ${reasonString}\n` +
      "     Please check that the transaction:\n" +
      "     - satisfies all conditions set by Solidity `require` statements.\n" +
      "     - does not trigger a Solidity `revert` statement.\n";
  }

  StatusError.super_.call(this, message);
  this.tx = tx;
  this.receipt = receipt;
  this.reason = reason;
}

module.exports = StatusError;
