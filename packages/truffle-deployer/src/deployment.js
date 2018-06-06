/**
 * @class  Deployment
 */
class Deployment {
  /**
   * constructor
   * @param  {Object} emitter                 async `Emittery` emitter
   * @param  {Number} confirmationsRequired   confirmations needed to resolve an instance
   */
  constructor(emitter, confirmationsRequired){
    this.confirmationsRequired = confirmationsRequired || 0;
    this.emitter = emitter;
    this.promiEventEmitters = [];
    this.confirmations = {};
    this.pollingInterval = 1000;
  }

  // ------------------------------------  Utils ---------------------------------------------------

  /**
   * Stub for future error code assignments on process.exit
   * @param  {String} type key map to code
   * @return {Number}      code to exit
   */
  _errorCodes(type){
    return 1;
  }

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
   * Gets arbitrary values from constructor params, if they exist.
   * @param  {Array}              args constructor params
   * @return {Any|Undefined}      gas value
   */
  _extractFromArgs(args, key){
    let value;

    args.forEach(arg => {
      const hasKey = !Array.isArray(arg) &&
                     typeof arg === 'object' &&
                     Object.keys(arg).includes(key);

      if(hasKey) value = arg[key];
    });
    return value;
  }

  /**
   * Queries the confirmations mapping periodically to see if we have
   * heard enough confirmations for a given tx to allow `deploy` to complete.
   * Resolves when this is true.
   * @param  {String} hash contract creation tx hash
   * @return {Promise}
   */
  async _waitForConfirmations(hash){
    let interval;
    const self = this;

    return new Promise(accept => {
      interval = setInterval(() => {
        if (self.confirmations[hash] >= self.confirmationsRequired){
          clearInterval(interval);
          accept();
        }
      }, self.pollingInterval);
    })
  }

  /**
   * Sanity checks catch-all:
   * Are we connected?
   * Is contract deployable?
   * @param  {Object} contract TruffleContract
   * @return {Promise}         throws on error
   */
  async _preFlightCheck(contract){
    // Check bytecode
    if(contract.bytecode === '0x') {
      await this.emitter.emit('error', {
        type: 'noBytecode',
        contract: contract,
      })

      throw new Error(this._errorCodes('noBytecode'));
    }

    // Check network
    await contract.detectNetwork();
  }

  /**
   * Handler for contract's `transactionHash` event. Rebroadcasts as a deployer event
   * @param  {Object} parent Deployment instance. Local `this` belongs to promievent
   * @param  {String} hash   tranactionHash
   */
  async _hashCb(parent, state, hash){
    const eventArgs = {
      contractName: state.contractName,
      transactionHash: hash
    }
    state.transactionHash = hash;
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
      contractName: state.contractName,
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
  async _confirmationCb(parent, state, num, receipt){
    const eventArgs = {
      contractName: state.contractName,
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
      let shouldDeploy = true;
      let state = {
        contractName: contract.contractName
      };

      await self._preFlightCheck(contract);

      const isDeployed = contract.isDeployed();
      const newArgs = await Promise.all(args);
      const currentBlock = await contract.web3.eth.getBlock('latest');

      // Last arg can be an object that tells us not to overwrite.
      if (newArgs.length > 0) {
        shouldDeploy = self._canOverwrite(newArgs, isDeployed);
      }

      // Case: deploy:
      if (shouldDeploy) {
        eventArgs = {
          state: state,
          contract: contract,
          deployed: isDeployed,
          blockLimit: currentBlock.gasLimit,
          gas: self._extractFromArgs(newArgs, 'gas') || contract.defaults().gas,
          gasPrice: self._extractFromArgs(newArgs, 'gasPrice') || contract.defaults().gasPrice,
          from: self._extractFromArgs(newArgs, 'from')  || contract.defaults().from,
        }

        // Detect constructor revert by running estimateGas
        try {
          eventArgs.estimate = await contract.new.estimateGas.apply(contract, newArgs);
        } catch(err){
          eventArgs.estimateError = err;
        }

        // Emit `preDeploy` & send transaction
        await self.emitter.emit('preDeploy', eventArgs);
        const promiEvent = contract.new.apply(contract, newArgs);

        // Track emitters for cleanup on exit
        self.promiEventEmitters.push(promiEvent);

        // Subscribe to contract events / rebroadcast them to any reporters
        promiEvent
          .on('transactionHash', self._hashCb.bind(promiEvent, self, state))
          .on('receipt',         self._receiptCb.bind(promiEvent, self, state))
          .on('confirmation',    self._confirmationCb.bind(promiEvent, self, state))

        // Get instance (or error)
        try {
          instance = await promiEvent;
        } catch(err){
          eventArgs.error = err.error || err;
          await self.emitter.emit('deployFailed', eventArgs);
          throw new Error(self._errorCodes('deployFailed'));
        }

        // Wait for confirmations
        if(self.confirmationsRequired !== 0){
          await self._waitForConfirmations(instance.transactionHash)
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
    const self = this;

    return async function() {
      const deployments = arr.map(args => {
        let params;
        let contract;

        if (Array.isArray(args)) {
          contract = args[0];

          (args.length > 1)
            ? params = args.slice(1)
            : params = [];

        } else {
          contract = args;
          params = [];
        }

        return self._deploy(contract, params)();
      });

      await self.emitter.emit('preDeployMany', arr);
      await Promise.all(deployments);
      await self.emitter.emit('postDeployMany', arr);
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
