const debug = require("debug")("deployer:deployment"); // eslint-disable-line no-unused-vars
const sanitizeMessage = require("./sanitizeMessage");

/**
 * @class  Deployment
 */
class Deployment {
  /**
   * constructor
   * @param  {Number} confirmations   confirmations needed to resolve an instance
   */
  constructor(options) {
    const networkConfig = options.networks[options.network] || {};
    this.confirmations = options.confirmations || 0;
    this.timeoutBlocks = options.timeoutBlocks || 0;
    this.pollingInterval = networkConfig.deploymentPollingInterval || 4000;
    this.promiEventEmitters = [];
    this.confirmationsMap = {};
    this.blockPoll;
    this.options = options;
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
   * @param  {Object}    interfaceAdapter
   */
  async _startBlockPolling(interfaceAdapter) {
    const self = this;
    const startTime = new Date().getTime();

    let secondsWaited = 0;
    let blocksWaited = 0;
    let currentBlock = await interfaceAdapter.getBlockNumber();

    self.blockPoll = setInterval(async () => {
      const newBlock = await interfaceAdapter.getBlockNumber();

      blocksWaited = newBlock - currentBlock + blocksWaited;
      currentBlock = newBlock;
      secondsWaited = Math.floor((new Date().getTime() - startTime) / 1000);

      const data = {
        blockNumber: newBlock,
        blocksWaited: blocksWaited,
        secondsWaited: secondsWaited
      };

      if (this.options && this.options.events) {
        this.options.events.emit("deployment:block", data);
      }
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
   * @param  {Object} interfaceAdapter
   * @return {Promise}             Resolves after `blockToWait` blocks
   */
  async _waitBlocks(blocksToWait, state, interfaceAdapter) {
    const self = this;
    let currentBlock = await interfaceAdapter.getBlockNumber();

    return new Promise(accept => {
      let blocksHeard = 0;

      const poll = setInterval(async () => {
        const newBlock = await interfaceAdapter.getBlockNumber();
        if (newBlock > currentBlock) {
          blocksHeard = newBlock - currentBlock + blocksHeard;
          currentBlock = newBlock;

          const data = {
            contractName: state.contractName,
            receipt: state.receipt,
            num: blocksHeard,
            block: currentBlock
          };
          if (this.options && this.options.events) {
            await this.options.events.emit("deployment:confirmation", data);
          }
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
      const data = {
        type: "noBatches",
        contract
      };
      let message;
      if (this.options && this.options.events) {
        message = await this.options.events.emit("deployment:error", data);
      }

      throw new Error(sanitizeMessage(message));
    }

    // Check bytecode
    if (contract.bytecode === "0x") {
      const data = {
        type: "noBytecode",
        contract
      };
      let message;
      if (this.options && this.options.events) {
        message = await this.options.events.emit("deployment:error", data);
      }

      throw new Error(sanitizeMessage(message));
    }

    // Check network
    await contract.detectNetwork();
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

  // ------------------------------------ Methods --------------------------------------------------
  /**
   *
   * @param  {Object} contract  Contract abstraction
   * @param  {Array}  args      Constructor arguments
   * @return {Promise}          Resolves an instance
   */
  executeDeployment(contract, args) {
    const self = this;
    return async function () {
      await self._preFlightCheck(contract);

      let instance;
      let eventArgs;
      let shouldDeploy = true;
      let state = {
        contractName: contract.contractName
      };

      const isDeployed = contract.isDeployed();
      const newArgs = await Promise.all(args);
      const currentBlock = await contract.interfaceAdapter.getBlock("latest");

      // Last arg can be an object that tells us not to overwrite.
      if (newArgs.length > 0) {
        shouldDeploy = self._canOverwrite(newArgs, isDeployed);
      }

      // Case: deploy:
      if (shouldDeploy) {
        /*
          Set timeout override. If this value is zero,
          @truffle/contract will defer to web3's defaults:
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

        // Emit `deployment:start` & send transaction
        if (self.options && self.options.events) {
          await self.options.events.emit("deployment:start", eventArgs);
        }
        const promiEvent = contract.new.apply(contract, newArgs);

        // Track emitters for cleanup on exit
        self.promiEventEmitters.push(promiEvent);

        // Subscribe to contract events / rebroadcast them to any reporters
        promiEvent
          .on("transactionHash", async hash => {
            if (self.options && self.options.events) {
              const data = {
                contractName: state.contractName,
                transactionHash: hash
              };
              await self.options.events.emit("deployment:txHash", data);
            }
          })
          .on("receipt", receipt => {
            // We want this receipt available for the post-deploy event
            // so gas reporting is at hand there.
            state.receipt = receipt;
          });

        await self._startBlockPolling(contract.interfaceAdapter);

        // Get instance (or error)
        try {
          instance = await promiEvent;
          self._stopBlockPolling();
        } catch (err) {
          self._stopBlockPolling();
          eventArgs.error = err.error || err;
          let message;
          if (self.options && self.options.events) {
            message = await self.options.events.emit(
              "deployment:failed",
              eventArgs
            );
          }
          self.close();
          throw new Error(sanitizeMessage(message));
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

      if (self.options && self.options.events) {
        await self.options.events.emit("deployment:succeed", eventArgs);
      }

      // Wait for `n` blocks
      if (self.confirmations !== 0 && shouldDeploy) {
        await self._waitBlocks(
          self.confirmations,
          state,
          contract.interfaceAdapter
        );
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
    this.promiEventEmitters.forEach(item => {
      item.removeAllListeners();
    });
  }
}

module.exports = Deployment;
