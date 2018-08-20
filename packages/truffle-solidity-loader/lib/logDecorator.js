const chalk = require('chalk')

const Logger = {
  log: function (msg) {
    console.log('[TRUFFLE SOLIDITY] ' + msg)
  },
  error: function (msg) {
    console.log(chalk.red('[! TRUFFLE SOLIDITY ERROR] ' + msg))
  },
  debugger: function (msg) {
    console.log(chalk.red('[! TRUFFLE SOLIDITY DEBUGGER] ' + msg))
  }
}

module.exports = Logger
