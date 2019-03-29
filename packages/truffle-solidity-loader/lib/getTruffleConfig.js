const findUp = require('find-up');
const Logger = require('./logDecorator');

const getTruffleConfig = function () {
  const isWin = /^win/.test(process.platform);
  let truffleJsFile = findUp.sync('truffle.js');
  let truffleConfigJsFile = findUp.sync('truffle-config.js');
  let file;
  
  if (truffleJsFile && truffleConfigJsFile && isWin) {
    Logger.log("Warning: Both truffle.js and truffle-config.js were found. Using truffle-config.js");
  } else if (truffleJsFile && truffleConfigJsFile && !isWin) {
    Logger.log("Warning: Both truffle.js and truffle-config.js were found. Using truffle.js");
  }

  if (isWin) {
    file = truffleConfigJsFile;
  } else {
    file = truffleJsFile;
  }

  if (file) {
    return file;
  }

  Logger.log('No Truffle config file found.');
};

module.exports = getTruffleConfig;
