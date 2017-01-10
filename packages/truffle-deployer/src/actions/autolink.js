var Linker = require("../linker");

module.exports = function(contract, deployer) {
  return function() {
    Linker.autolink(contract, deployer.known_contracts, deployer.logger);
  };
};
