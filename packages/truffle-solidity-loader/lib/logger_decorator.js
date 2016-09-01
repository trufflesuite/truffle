var chalk = require('chalk')

var Logger = {
  log: function(msg) {
    console.log("[TRUFFLE SOLIDITY] " + msg)
  },
  error: function(msg) {
    console.log(chalk.red("[! TRUFFLE SOLIDITY ERROR] " + msg))
  }
}

module.exports = Logger;
