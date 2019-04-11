const findUp = require('find-up');
const Logger = require('./logDecorator');

const getTruffleConfig = function () {
  let defaultConfigFile = findUp.sync('truffle-config.js');
  let backupConfigFile = findUp.sync('truffle.js');
  let file;
  
  if (backupConfigFile && defaultConfigFile) {
    Logger.log("Warning: Both truffle.js and truffle-config.js were found. Using truffle-config.js");
    file = defaultConfigFile;
  } else if (defaultConfigFile) {
    file = defaultConfigFile;
  } else if (backupConfigFile) {
    file = backupConfigFile;
  }

  if (file) {
    return file;
  }

  Logger.log('No Truffle config file found.');
};

module.exports = getTruffleConfig;
