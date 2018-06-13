module.exports = function(contract, args, deployer) {
  return function() {
    deployer.logger.log("Creating new instance of " + contract.contract_name);
    // Evaluate any arguments if they're promises
    return Promise.all(args).then(function(new_args) {
      return contract.new.apply(contract, args)
    });
  };
};
