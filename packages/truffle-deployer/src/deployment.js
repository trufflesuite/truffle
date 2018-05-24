
/**
 * @class  Deployment
 */
class Deployment {
  /**
   * constructor
   * @param  {Object} emitter        async `Emittery` emitter
   * @param  {Number} blocksToWait   confirmations needed to resolve an instance
   */
  constructor(emitter, blocksToWait){
    this.blocksToWait = blocksToWait || 0;
    this.emitter = emitter;
    this.promiEventEmitters = [];
    this.confirmations = {};
    this.pollingInterval = 1000;
  }

  // ------------------------------------  Utils ---------------------------------------------------

  /**
   * Helper to parse a deploy statement's overwrite option
   * @param  {Arry}    args        arguments passed to deploy
   * @param  {Boolean} isDeployed  is contract deployed?
   * @return {Boolean}             true if overwrite is ok
   */
  _canOverwrite(args, isDeployed){
    const lastArg = args[args.length - 1];
    const isObject = typeof lastArg === "object";

    const overwrite = isObject &&
                      isDeployed &&
                      lastArg.overwrite === false;

    isObject && delete lastArg.overwrite;
    return !overwrite;
  }

  /**
   * Queries the confirmations mappping periodically to see if we have
   * heard enough confirmations for a given tx to allow `deploy` to complete.
   * Resolves when this is true.
   * @param  {String} hash contract creation tx hash
   * @return {Promise}
   */
  _waitForConfirmation(hash){
    let interval;
    const self = this;

    return new Promise(accept => {
      interval = setInterval(() => {
        if (self.confirmations[hash] >= self.blocksToWait){
          clearInterval(interval);
          resolve();
        }
      }, self.pollingInterval );
    })
  }

  /**
   * Handler for contract's `transactionHash` event. Rebroadcasts as a deployer event
   * @param  {Object} parent Deployment instance. Local `this` belongs to promievent
   * @param  {String} hash   tranactionHash
   */
  async _hashCb(parent, hash){
    const eventArgs = {
      transactionHash: hash
    }

    await parent.emitter.emit('transactionHash', eventArgs);
    this.removeListener('transactionHash', parent._hashCb);
  }

  /**
   * Handler for contract's `receipt` event. Rebroadcasts as a deployer event
   * @param  {Object} parent  Deployment instance. Local `this` belongs to promievent
   * @param  {Object} state   store for the receipt value
   * @param  {Object} receipt
   */
  async _receiptCb(parent, state, receipt){
    const eventArgs = {
      receipt: receipt
    }

    // We want this receipt available for the post-deploy event
    // so gas reporting is at hand there.
    state.receipt = receipt;
    await parent.emitter.emit('receipt', eventArgs);
    this.removeListener('receipt', parent._receiptCb);
  }

  /**
   * Handler for contract's `confirmation` event. Rebroadcasts as a deployer event
   * and maintains a table of txHashes & their current confirmation number. This
   * table gets polled if the user needs to wait a few blocks before getting
   * an instance back.
   * @param  {Object} parent  Deployment instance. Local `this` belongs to promievent
   * @param  {Number} num     Confirmation number
   * @param  {Object} receipt transaction receipt
   */
  async _confirmationCb(parent, num, receipt){
    const eventArgs = {
      num: num,
      receipt: receipt
    };

    parent.confirmations[receipt.transactionHash] = num;
    await parent.emitter.emit('confirmation', eventArgs);
  }

  // ------------------------------------ Methods --------------------------------------------------
  /**
   *
   * @param  {Object} contract  Contract abstraction
   * @param  {Array}  args      Constructor arguments
   * @return {Promise}          Resolves an instance
   */
  _deploy(contract, args){
    const self = this;

    return async function() {
      let instance;
      let eventArgs;
      let state = {};
      let shouldDeploy = true;
      const isDeployed = contract.isDeployed();

      await contract.detectNetwork();

      // Arguments may be promises
      const newArgs = await Promise.all(args);

      // Last arg can be an object that tells us not to overwrite.
      if (newArgs.length > 0) {
        shouldDeploy = self._canOverwrite(newArgs, isDeployed);
      }

      // Case: deploy:
      if (shouldDeploy) {
        eventArgs = {
          contract: contract,
          deployed: isDeployed
        }

        // Emit `preDeploy` & send transaction
        await self.emitter.emit('preDeploy', eventArgs);
        const promiEvent = contract.new.apply(contract, newArgs);

        // Track emitters for cleanup on exit
        self.promiEventEmitters.push(promiEvent);

        // Subscribe to contract events / rebroadcast them to any reporters
        promiEvent
          .on('transactionHash', self._hashCb.bind(promiEvent, self))
          .on('receipt',         self._receiptCb.bind(promiEvent, self, state))
          .on('confirmation',    self._confirmationCb.bind(promiEvent, self))

        // Get instance (or error)
        try {
          instance = await promiEvent;
        } catch(error){
          await self.emitter.emit('deployFailed', { error: error});
          throw new Error();
        }

        // Wait for confirmations
        if(self.blocksToWait !== 0){
          await self.waitForConfirmations(instance.transactionHash)
        }

      // Case: already deployed
      } else {
        instance = await contract.deployed();
      }

      // Emit `postDeploy`
      eventArgs = {
        contract: contract,
        instance: instance,
        deployed: shouldDeploy,
        receipt: state.receipt
      }

      await self.emitter.emit('postDeploy', eventArgs);

      // Finish: Ensure the address and tx-hash are set on the contract.
      contract.address = instance.address;
      contract.transactionHash = instance.transactionHash;
      return instance;
    };
  }

  /**
   * Deploys an array of contracts
   * @param  {Array} arr  Array of contract abstractions to deploy
   * @return {Promise}
   */
  _deployMany(arr){
    return function() {
      const deployments = arr.map(args => {
        let contract;

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
  }

  /**
   * Cleans up promiEvents' emitter listeners
   */
  _close(){
    this.promiEventEmitters.forEach(item => {
      item.removeAllListeners();
    });
  }
};

module.exports = Deployment;
