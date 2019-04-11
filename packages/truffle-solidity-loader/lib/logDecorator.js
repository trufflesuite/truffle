const chalk = require("chalk");

const Logger = {
  log(msg) {
    // sometimes reporter msg is undefined
    if (msg) console.log(`[TRUFFLE SOLIDITY] ${msg}`);
  },
  error(msg) {
    console.log(chalk.red(`[! TRUFFLE SOLIDITY ERROR] ${msg}`));
  },
  debug(msg) {
    console.debug(chalk.red(`[! TRUFFLE SOLIDITY DEBUGGER] ${msg}`));
  }
};

module.exports = Logger;
