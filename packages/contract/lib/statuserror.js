const TruffleError = require("@truffle/error");
const inherits = require("util").inherits;
const utils = require("./utils");

inherits(StatusError, TruffleError);

const defaultGas = 90000;

function StatusError(args, tx, receipt, reason) {
  let message;
  const gasLimit = args.gas || defaultGas;
  let reasonString = "";

  if (reason) reasonString = `Reason given: ${reason}.`;

  if (utils.bigNumberify(receipt.gasUsed).eq(utils.bigNumberify(gasLimit))) {
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
