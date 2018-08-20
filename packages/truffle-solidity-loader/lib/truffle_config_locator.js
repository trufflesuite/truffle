var findUp = require('find-up')
var Logger = require('./logger_decorator')

var TruffleConfigLocator = {
  find: function() {
    var isWin = /^win/.test(process.platform)
    var file

    if(isWin) {
      file = findUp.sync('truffle-config.js')
    } else {
      file = findUp.sync('truffle.js')
    }

    if(file) {
      return file
    }

    Logger.log("No Truffle config file found.")
  }
}

module.exports = TruffleConfigLocator
