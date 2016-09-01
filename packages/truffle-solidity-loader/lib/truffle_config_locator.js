var findUp = require('find-up')
var Logger = require('./logger_decorator')

var TruffleConfigLocator = {
  find: function() {
    var isWin = /^win/.test(process.platform)
    var file

    if(isWin) {
      Logger.log("Searching for truffle-config.js")
      file = findUp.sync('truffle-config.js')
    } else {
      Logger.log('Searching for truffle.js')
      file = findUp.sync('truffle.js')
    }

    if(file) {
      Logger.log("Found Truffle config at: " + file)
      return file
    }

    Logger.log("No Truffle config file found.")
  }
}

module.exports = TruffleConfigLocator
