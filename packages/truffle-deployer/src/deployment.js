const util = require('util')

/**
 * @class  Deployment
 */
class Deployment {
  /**
   * constructor
   * @param  {Object} emitter                 async `Emittery` emitter
   * @param  {Number} confirmations   confirmations needed to resolve an instance
   */
  constructor(emitter, confirmations){
    this.confirmations = confirmations || 0;
    this.emitter = emitter;
    this.promiEventEmitters = [];
    this.confirmationsMap = {};
    this.pollingInterval = 1000;
    this.blockPoll;
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

  async _waitMS(ms){
    return new Promise(resolve => setTimeout(() => resolve(), ms))
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
   * NB: This should work but there are outstanding issues at both
   * geth (with websockets) & web3 (with confirmation handling over RPC) that
   * prevent it from being reliable. We're using very simple block polling instead.
   * (See also _confirmationCb )
   *
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
        if (self.confirmationsMap[hash] >= self.confirmations){
          clearInterval(interval);
          accept();
        }
      }, self.pollingInterval);
    })
  }

  /**
   * Emits a `block` event on each new block heard. This polling is
   * meant to be cancelled immediately on resolution of the
   * contract instance or on error. (See stopBlockPolling)
   */
  async _startBlockPolling(web3){
    const self = this;
    const startTime = new Date().getTime();

    let secondsWaited = 0;
    let blocksWaited = 0;
    let currentBlock = await web3.eth.getBlockNumber();

    self.blockPoll = setInterval(async() => {
      const newBlock = await web3.eth.getBlockNumber();

      if (newBlock > currentBlock){
        blocksWaited = (newBlock - currentBlock) + blocksWaited;
        currentBlock = newBlock;
        secondsWaited = Math.floor((new Date().getTime() - startTime) / 1000);

        const eventArgs = {
          blockNumber: newBlock,
          blocksWaited: blocksWaited,
          secondsWaited: secondsWaited
        };

        await self.emitter.emit('block', eventArgs);
      }
    }, self.pollingInterval);
  }

  /**
   * Clears the interval timer initiated by `startBlockPolling
   */
  _stopBlockPolling(){
    clearInterval(this.blockPoll);
  }

  /**
   * Waits `n` blocks after a tx is mined, firing a pseudo
   * 'confirmation' event for each one.
   * @param  {Number} blocksToWait
   * @param  {Object} receipt
   * @param  {Object} web3
   * @return {Promise}             Resolves after `blockToWait` blocks
   */
  async _waitBlocks(blocksToWait, state, web3){
    const self = this;
    let currentBlock = await web3.eth.getBlockNumber();

    return new Promise(accept => {
      let blocksHeard = 0;

      const poll = setInterval(async () => {
        const newBlock = await web3.eth.getBlockNumber();

        if(newBlock > currentBlock){
          blocksHeard = (newBlock - currentBlock) + blocksHeard;
          currentBlock = newBlock;

          const eventArgs = {
            contractName: state.contractName,
            receipt: state.receipt,
            num: blocksHeard,
            block: currentBlock,
          };

          await self.emitter.emit('confirmation', eventArgs);
        }

        if (blocksHeard >= blocksToWait){
          clearInterval(poll)
          accept();
        }
      }, self.pollingInterval);
    });
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
   * NB: This should work but there are outstanding issues at both
   * geth (with websockets) & web3 (with confirmation handling over RPC) that
   * prevent it from being reliable. We're using very simple block polling instead.
   * (See also _waitForConfirmations )
   *
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

    parent.confirmationsMap[receipt.transactionHash] = num;
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

        await self._startBlockPolling(contract.web3);

        // Get instance (or error)
        try {
          instance = await promiEvent;
          self._stopBlockPolling();

        } catch(err){

          self._stopBlockPolling();
          eventArgs.error = err.error || err;
          await self.emitter.emit('deployFailed', eventArgs);
          throw new Error(self._errorCodes('deployFailed'));
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

      // Wait for `n` blocks
      if(self.confirmations !== 0 && shouldDeploy){
        await self._waitBlocks(self.confirmations, state, contract.web3);
      }
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