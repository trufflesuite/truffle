const findUp = require('find-up');
const Logger = require('./logDecorator');

const getTruffleConfig = function () {
  const isWin = /^win/.test(process.platform);
  let file;

  if (isWin) {
    file = findUp.sync('truffle-config.js');
  } else {
    file = findUp.sync('truffle.js');
  }

  if (file) {
    return file;
  }

  Logger.log('No Truffle config file found.');
};

module.exports = getTruffleConfig;
