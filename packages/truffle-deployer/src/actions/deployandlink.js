var Linker = require("../linker");
var deploy = require("./deploy");

module.exports = function(contract, args, deployer) {
  return function() {
    // Autolink the contract at deploy time.
    Linker.autolink(contract, deployer.known_contracts, deployer.logger);

    return deploy(contract, args, deployer)();
  }
};
