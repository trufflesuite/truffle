const debug = require("debug")("deployer:deployment"); // eslint-disable-line no-unused-vars

/**
 * @class  Deployment
 */
class Deployment {
  /**
   * constructor
   * @param  {Object} emitter         async `Emittery` emitter
   * @param  {Number} confirmations   confirmations needed to resolve an instance
   */
  constructor(emitter, options) {
    this.confirmations = options.confirmations || 0;
    this.timeoutBlocks = options.timeoutBlocks || 0;
    this.emitter = emitter;
    this.promiEventEmitters = [];
    this.confirmationsMap = {};
    this.pollingInterval = 4000;
    this.blockPoll;
  }

  // ------------------------------------  Utils ---------------------------------------------------

  /**
   * Stub for future error code assignments on process.exit
   * @private
   * @param  {String} name contract name
   * @return {Number}      code to exit
   */
  _errors() {
    return `Migrations failure`;
  }

  /**
   * Helper to parse a deploy statement's overwrite option
   * @private
   * @param  {Arry}    args        arguments passed to deploy
   * @param  {Boolean} isDeployed  is contract deployed?
   * @return {Boolean}             true if overwrite is ok
   */
  _canOverwrite(args, isDeployed) {
    const lastArg = args[args.length - 1];
    const isObject = typeof lastArg === "object";

    const overwrite = isObject && isDeployed && lastArg.overwrite === false;

    isObject && delete lastArg.overwrite;
    return !overwrite;
  }

  /**
   * Gets arbitrary values from constructor params, if they exist.
   * @private
   * @param  {Array}              args constructor params
   * @return {Any|Undefined}      gas value
   */
  _extractFromArgs(args, key) {
    let value;

    args.forEach(arg => {
      const hasKey =
        !Array.isArray(arg) &&
        typeof arg === "object" &&
        Object.keys(arg).includes(key);

      if (hasKey) value = arg[key];
    });
    return value;
  }

  /**
   * Emits a `block` event on each new block heard. This polling is
   * meant to be cancelled immediately on resolution of the
   * contract instance or on error. (See stopBlockPolling)
   * @private
   * @param  {Object}    web3
   */
  async _startBlockPolling(web3) {
    const self = this;
    const startTime = new Date().getTime();

    let secondsWaited = 0;
    let blocksWaited = 0;
    let currentBlock = await web3.eth.getBlockNumber();

    self.blockPoll = setInterval(async () => {
      const newBlock = await web3.eth.getBlockNumber();

      blocksWaited = newBlock - currentBlock + blocksWaited;
      currentBlock = newBlock;
      secondsWaited = Math.floor((new Date().getTime() - startTime) / 1000);

      const eventArgs = {
        blockNumber: newBlock,
        blocksWaited: blocksWaited,
        secondsWaited: secondsWaited
      };

      await self.emitter.emit("block", eventArgs);
    }, self.pollingInterval);
  }

  /**
   * Clears the interval timer initiated by `startBlockPolling
   * @private
   */
  _stopBlockPolling() {
    clearInterval(this.blockPoll);
  }

  /**
   * Waits `n` blocks after a tx is mined, firing a pseudo
   * 'confirmation' event for each one.
   * @private
   * @param  {Number} blocksToWait
   * @param  {Object} receipt
   * @param  {Object} web3
   * @return {Promise}             Resolves after `blockToWait` blocks
   */
  async _waitBlocks(blocksToWait, state, web3) {
    const self = this;
    let currentBlock = await web3.eth.getBlockNumber();

    return new Promise(accept => {
      let blocksHeard = 0;

      const poll = setInterval(async () => {
        const newBlock = await web3.eth.getBlockNumber();

        if (newBlock > currentBlock) {
          blocksHeard = newBlock - currentBlock + blocksHeard;
          currentBlock = newBlock;

          const eventArgs = {
            contractName: state.contractName,
            receipt: state.receipt,
            num: blocksHeard,
            block: currentBlock
          };

          await self.emitter.emit("confirmation", eventArgs);
        }

        if (blocksHeard >= blocksToWait) {
          clearInterval(poll);
          accept();
        }
      }, self.pollingInterval);
    });
  }

  /**
   * Sanity checks catch-all:
   * Are we connected?
   * Is contract deployable?
   * @private
   * @param  {Object} contract TruffleContract
   * @return {Promise}         throws on error
   */
  async _preFlightCheck(contract) {
    // Check that contract is not array
    if (Array.isArray(contract)) {
      const message = await this.emitter.emit("error", {
        type: "noBatches",
        contract: null
      });

      throw new Error(message);
    }

    // Check bytecode
    if (contract.bytecode === "0x") {
      const message = await this.emitter.emit("error", {
        type: "noBytecode",
        contract: contract
      });

      throw new Error(message);
    }

    // Check network
    await contract.detectNetwork();
  }

  /**
   * Handler for contract's `transactionHash` event. Rebroadcasts as a deployer event
   * @private
   * @param  {Object} parent Deployment instance. Local `this` belongs to promievent
   * @param  {String} hash   tranactionHash
   */
  async _hashCb(parent, state, hash) {
    const eventArgs = {
      contractName: state.contractName,
      transactionHash: hash
    };
    state.transactionHash = hash;
    await parent.emitter.emit("transactionHash", eventArgs);
    this.removeListener("transactionHash", parent._hashCb);
  }

  /**
   * Handler for contract's `receipt` event. Rebroadcasts as a deployer event
   * @private
   * @param  {Object} parent  Deployment instance. Local `this` belongs to promievent
   * @param  {Object} state   store for the receipt value
   * @param  {Object} receipt
   */
  async _receiptCb(parent, state, receipt) {
    const eventArgs = {
      contractName: state.contractName,
      receipt: receipt
    };

    // We want this receipt available for the post-deploy event
    // so gas reporting is at hand there.
    state.receipt = receipt;
    await parent.emitter.emit("receipt", eventArgs);
    this.removeListener("receipt", parent._receiptCb);
  }

  // ----------------- Confirmations Handling (temporarily disabled) -------------------------------
  /**
   * There are outstanding issues at both geth (with websockets) & web3 (with confirmation handling
   * over RPC) that impair the confirmations handlers' reliability. In the interim we're using
   * simple block polling instead. (See also _confirmationCb )
   *
   * Queries the confirmations mapping periodically to see if we have
   * heard enough confirmations for a given tx to allow `deploy` to complete.
   * Resolves when this is true.
   *
   * @private
   * @param  {String} hash contract creation tx hash
   * @return {Promise}
   */
  async _waitForConfirmations(hash) {
    let interval;
    const self = this;

    return new Promise(accept => {
      interval = setInterval(() => {
        if (self.confirmationsMap[hash] >= self.confirmations) {
          clearInterval(interval);
          accept();
        }
      }, self.pollingInterval);
    });
  }

  /**
   * Handler for contract's `confirmation` event. Rebroadcasts as a deployer event
   * and maintains a table of txHashes & their current confirmation number. This
   * table gets polled if the user needs to wait a few blocks before getting
   * an instance back.
   * @private
   * @param  {Object} parent  Deployment instance. Local `this` belongs to promievent
   * @param  {Number} num     Confirmation number
   * @param  {Object} receipt transaction receipt
   */
  async _confirmationCb(parent, state, num, receipt) {
    const eventArgs = {
      contractName: state.contractName,
      num: num,
      receipt: receipt
    };

    parent.confirmationsMap[receipt.transactionHash] = num;
    await parent.emitter.emit("confirmation", eventArgs);
  }

  // ------------------------------------ Methods --------------------------------------------------
  /**
   *
   * @param  {Object} contract  Contract abstraction
   * @param  {Array}  args      Constructor arguments
   * @return {Promise}          Resolves an instance
   */
  executeDeployment(contract, args) {
    const self = this;

    return async function() {
      await self._preFlightCheck(contract);

      let instance;
      let eventArgs;
      let shouldDeploy = true;
      let state = {
        contractName: contract.contractName
      };

      const isDeployed = contract.isDeployed();
      const newArgs = await Promise.all(args);
      const currentBlock = await contract.web3.eth.getBlock("latest");

      // Last arg can be an object that tells us not to overwrite.
      if (newArgs.length > 0) {
        shouldDeploy = self._canOverwrite(newArgs, isDeployed);
      }

      // Case: deploy:
      if (shouldDeploy) {
        /*
          Set timeout override. If this value is zero,
          truffle-contract will defer to web3's defaults:
          - 50 blocks (websockets) OR 50 * 15sec (http)
        */
        contract.timeoutBlocks = self.timeoutBlocks;

        eventArgs = {
          state: state,
          contract: contract,
          deployed: isDeployed,
          blockLimit: currentBlock.gasLimit,
          gas: self._extractFromArgs(newArgs, "gas") || contract.defaults().gas,
          gasPrice:
            self._extractFromArgs(newArgs, "gasPrice") ||
            contract.defaults().gasPrice,
          from:
            self._extractFromArgs(newArgs, "from") || contract.defaults().from
        };

        // Get an estimate for previews / detect constructor revert
        // NB: web3 does not strip the revert msg here like it does for `deploy`
        try {
          eventArgs.estimate = await contract.new.estimateGas.apply(
            contract,
            newArgs
          );
        } catch (err) {
          eventArgs.estimateError = err;
        }

        // Emit `preDeploy` & send transaction
        await self.emitter.emit("preDeploy", eventArgs);
        const promiEvent = contract.new.apply(contract, newArgs);

        // Track emitters for cleanup on exit
        self.promiEventEmitters.push(promiEvent);

        // Subscribe to contract events / rebroadcast them to any reporters
        promiEvent
          .on("transactionHash", self._hashCb.bind(promiEvent, self, state))
          .on("receipt", self._receiptCb.bind(promiEvent, self, state));

        await self._startBlockPolling(contract.web3);

        // Get instance (or error)
        try {
          instance = await promiEvent;
          self._stopBlockPolling();
        } catch (err) {
          self._stopBlockPolling();
          eventArgs.error = err.error || err;
          let message = await self.emitter.emit("deployFailed", eventArgs);

          // Reporter might not be enabled (via Migrate.launchReporter) so
          // message is a (potentially empty) array of results from the emitter
          if (!message.length) {
            message = `while migrating ${contract.contractName}: ${
              eventArgs.error.message
            }`;
          }

          self.close();
          throw new Error(message);
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
      };

      await self.emitter.emit("postDeploy", eventArgs);

      // Wait for `n` blocks
      if (self.confirmations !== 0 && shouldDeploy) {
        await self._waitBlocks(self.confirmations, state, contract.web3);
      }
      // Finish: Ensure the address and tx-hash are set on the contract.
      contract.address = instance.address;
      contract.transactionHash = instance.transactionHash;
      return instance;
    };
  }

  /**
   * Cleans up promiEvents' emitter listeners
   */
  close() {
    this.emitter.clearListeners();
    this.promiEventEmitters.forEach(item => {
      item.removeAllListeners();
    });
  }
}

module.exports = Deployment;
