
// --------------------------------------- Utils ---------------------------------------------------

/**
 * Helper to parse a deploy statement's overwrite option
 * @param  {Arry}    args        arguments passed to deploy
 * @param  {Boolean} isDeployed  is contract deployed?
 * @return {Boolean}             true if overwrite is ok
 */
const canOverwrite = function(args, isDeployed){
  const lastArg = args[args.length - 1];
  const isObject = typeof lastArg === "object";

  const overwrite = isObject &&
                    isDeployed &&
                    lastArg.overwrite === false;

  isObject && delete lastArg.overwrite;
  return !overwrite;
}

/**
 * Wrapper that transforms instance events for txHash, confirmation, etc
 * into Deployer async-eventemitter events and manages confirmation delay.
 * @param  {PromiEvent} promiEvent  return value of contract.new
 * @param  {Object}     state       to collect data (receipt)
 */
const handleContractEvents = function(promiEvent, state, deployer){
  promiEvent
    .on('transactionHash', function(hash){
      deployer.emit('transactionHash', {
        transactionHash: hash
      });
      this.removeListener('transactionHash');
     })

    .on('receipt', function(receipt){
      state.receipt = receipt;
    })

    .on('confirmation', function(num, receipt){
      deployer.emit('confirmation', {
        num: num,
        receipt: receipt
      });
      // TO DO: add confirmation logic
      this.removeListener('confirmation');
    });
}

// -------------------------------------- Deploy ---------------------------------------------------

/**
 * Deploys an instance.
 * @param  {TruffleContract} contract contract to deploy
 * @param  {Array}           args (constructor args and options)
 * @param  {Deployer}        deployer [description]
 * @return {Promise}         resolves an instance
 */
const deploy = function(contract, args, deployer) {
  return async function() {
    let instance;
    let state = {};
    let shouldDeploy = true;
    const isDeployed = contract.isDeployed();

    await contract.detectNetwork();

    // Evaluate any arguments if they're promises
    // (we need to do this in all cases to maintain consistency)
    const newArgs = await Promise.all(args);

    // Check the last argument. If it's an object that tells us not to overwrite,
    // then lets not.
    if (newArgs.length > 0) {
      shouldDeploy = canOverwrite(newArgs, isDeployed);
    }

    if (shouldDeploy) {
      deployer.emit('preDeploy', {
        contract: contract,
        deployed: isDeployed
      });

      const promiEvent = contract.new.apply(contract, newArgs);
      handleContractEvents(promiEvent, state, deployer);

      try {
        instance = await promiEvent;
      } catch(error){
        deployer.emit('deployFailed', error);
        // Should this be conditional??
        throw new Error();
      }

      // TODO: Idle here, waiting for
      // the min confirmations to click past

    } else {
      instance = await contract.deployed();
    }

    deployer.emit('postDeploy', {
      contract: contract,
      instance: instance,
      deployed: shouldDeploy,
      receipt: state.receipt
    });

    // Ensure the address and tx-hash are set on the contract.
    contract.address = instance.address;
    contract.transactionHash = instance.transactionHash;
    return instance;
  };
};

module.exports = deploy;
