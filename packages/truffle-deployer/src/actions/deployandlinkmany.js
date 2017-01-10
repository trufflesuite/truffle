var deploy = require("./deploy");
var Linker = require("../linker.js");

module.exports = function(arr, deployer) {
  return function() {
    // Perform all autolinking before deployment.
    arr.forEach(function(args) {
      var contract;

      if (Array.isArray(args)) {
        contract = args[0];
      } else {
        contract = args;
      }

      // Autolink the contract at deploy time.
      Linker.autolink(contract, deployer.known_contracts, deployer.logger);
    });

    var deployments = arr.map(function(args) {
      var contract;

      if (Array.isArray(args)) {
        contract = args.shift();
      } else {
        contract = args;
        args = [];
      }

      return deploy(contract, args, deployer)();
    });

    return Promise.all(deployments);
  };
};
