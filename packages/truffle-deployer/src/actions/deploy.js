module.exports = function(contract, args, deployer) {
  return function() {
    var prefix = "Deploying ";
    if (contract.isDeployed()) {
      prefix = "Replacing ";
    }

    deployer.logger.log(prefix + contract.contract_name + "...");

    // Evaluate any arguments if they're promises
    return Promise.all(args).then(function(new_args) {
      return contract.new.apply(contract, new_args);
    }).then(function(instance) {
      deployer.logger.log(contract.contract_name + ": " + instance.address);
      contract.address = instance.address;
    });
  };
};
