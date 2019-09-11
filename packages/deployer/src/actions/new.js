module.exports = function(contract, args, deployer) {
  return async function() {
    deployer.logger.log("Creating new instance of " + contract.contract_name);
    // Evaluate any arguments if they're promises
    await Promise.all(args);
    return contract.new.apply(contract, args);
  };
};
