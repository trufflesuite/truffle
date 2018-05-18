
const canOverwrite = function(args, isDeployed){
  const lastArg = args[args.length - 1];
  const isObject = typeof lastArg === "object";

  const overwrite = isObject &&
                    isDeployed &&
                    lastArg.overwrite === false;

  isObject && delete lastArg.overwrite;
  return !overwrite;
}

const deploy = function(contract, args, deployer) {
  return async function() {
    let instance;
    let shouldDeploy = true;
    const isDeployed = contract.isDeployed();

    // First detect the network to see if it's deployed.
    await contract.detectNetwork();

    // Evaluate any arguments if they're promises
    // (we need to do this in all cases to maintain consistency)
    const newArgs = await Promise.all(args);

    // Check the last argument. If it's an object that tells us not to overwrite, then lets not.
    if (newArgs.length > 0) {
      shouldDeploy = canOverwrite(newArgs, isDeployed);
    }

    if (shouldDeploy) {
      let prefix;
      (isDeployed)
        ? prefix = "Deploying "
        : prefix = "Replacing ";

      deployer.logger.log(prefix + contract.contract_name + "...");
      const promiEvent = contract.new.apply(contract, newArgs)

      promiEvent
        .on('transactionHash', function(hash){
          this.removeListener('transactionHash');
         })
        .on('confirmation', function(num, receipt){
          this.removeListener('confirmation');
        });

      instance = await promiEvent;

    } else {
      instance = await contract.deployed();
    }

    (shouldDeploy)
      ? deployer.logger.log(contract.contract_name + ": " + instance.address)
      : deployer.logger.log("Didn't deploy " + contract.contract_name + "; using " + instance.address);


    // Ensure the address and tx-hash are set on the contract.
    contract.address = instance.address;
    contract.transactionHash = instance.transactionHash;
    return instance;
  };
};

module.exports = deploy;
