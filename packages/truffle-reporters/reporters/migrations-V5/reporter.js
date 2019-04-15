const debug = require("debug")("reporters:migrations:reporter"); // eslint-disable-line no-unused-vars
const web3Utils = require("web3-utils");
const readline = require("readline");
const ora = require("ora");

const indentedSpinner = require("./indentedSpinner");
const MigrationsMessages = require("./messages");

/**
 *  Reporter consumed by a migrations sequence which iteself consumes a series of Migration and
 *  Deployer instances that emit both async `Emittery` events and conventional EventEmitter
 *  events (from Web3PromiEvent). This reporter is designed to track the execution of
 *  several migrations files in sequence and is analagous to the Mocha reporter in that:
 *
 *  test:: deployment
 *  suite:: deployer.start to deployer.finish
 *  test file:: migrations file
 *
 *  Each time a new migrations file loads, the reporter needs the following properties
 *  updated to reflect the current emitter source:
 *  + `this.migration`
 *  + `this.deployer`
 */
class Reporter {
  constructor() {
    this.deployer = null;
    this.migration = null;
    this.currentGasTotal = new web3Utils.BN(0);
    this.currentCostTotal = new web3Utils.BN(0);
    this.finalCostTotal = new web3Utils.BN(0);
    this.deployments = 0;
    this.separator = "\n";
    this.summary = [];
    this.currentFileIndex = -1;
    this.blockSpinner = null;
    this.currentBlockWait = "";

    this.messages = new MigrationsMessages(this);
  }

  // ------------------------------------  Utilities -----------------------------------------------

  /**
   * Sets a Migration instance to be the current migrations events emitter source
   * @param {Migration} migration
   */
  setMigration(migration) {
    this.migration = migration;
  }

  /**
   * Sets a Deployer instance as the current deployer events emitter source
   * @param {Deployer} deployer
   */
  setDeployer(deployer) {
    this.deployer = deployer;
  }

  /**
   * Registers emitter handlers
   */
  listen() {
    // Migration
    this.migration.emitter.on("preMigrate", this.preMigrate.bind(this));
    this.migration.emitter.on(
      "startTransaction",
      this.startTransaction.bind(this)
    );
    this.migration.emitter.on("endTransaction", this.endTransaction.bind(this));
    this.migration.emitter.on("postMigrate", this.postMigrate.bind(this));
    this.migration.emitter.on("error", this.error.bind(this));

    // Deployment
    this.deployer.emitter.on("preDeploy", this.preDeploy.bind(this));
    this.deployer.emitter.on("postDeploy", this.postDeploy.bind(this));
    this.deployer.emitter.on("deployFailed", this.deployFailed.bind(this));
    this.deployer.emitter.on("linking", this.linking.bind(this));
    this.deployer.emitter.on("error", this.error.bind(this));
    this.deployer.emitter.on("transactionHash", this.hash.bind(this));
    this.deployer.emitter.on("confirmation", this.confirmation.bind(this));
    this.deployer.emitter.on("block", this.block.bind(this));
    this.deployer.emitter.on(
      "startTransaction",
      this.startTransaction.bind(this)
    );
    this.deployer.emitter.on("endTransaction", this.endTransaction.bind(this));
  }

  /**
   * Retrieves gas usage totals per migrations file / totals since the reporter
   * started running. Calling this method resets the gas counters for migrations totals
   */
  getTotals() {
    const gas = this.currentGasTotal.clone();
    const cost = web3Utils.fromWei(this.currentCostTotal, "ether");
    this.finalCostTotal = this.finalCostTotal.add(this.currentCostTotal);

    this.currentGasTotal = new web3Utils.BN(0);
    this.currentCostTotal = new web3Utils.BN(0);

    return {
      gas: gas.toString(10),
      cost: cost,
      finalCost: web3Utils.fromWei(this.finalCostTotal, "ether"),
      deployments: this.deployments.toString()
    };
  }

  /**
   * Queries the user for a true/false response and resolves the result.
   * @param  {String} type identifier the reporter consumes to format query
   * @return {Promise}
   */
  askBoolean(type) {
    const self = this;
    const question = this.messages.questions(type);
    const exitLine = this.messages.exitLines(type);

    // NB: We need direct access to a writeable stream here.
    // This ignores `quiet` - but we only use that mode for `truffle test`.
    const input = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const affirmations = ["y", "yes", "YES", "Yes"];

    return new Promise(resolve => {
      input.question(question, answer => {
        if (affirmations.includes(answer.trim())) {
          input.close();
          return resolve(true);
        }

        input.close();
        self.deployer && self.deployer.logger.log(exitLine);
        resolve(false);
      });
    });
  }

  /**
   * Error dispatcher. Parses the error returned from web3 and outputs a more verbose error after
   * doing what it can to evaluate the failure context from data passed to it.
   * @param  {Object} data info collected during deployment attempt
   */
  async processDeploymentError(data) {
    const error = data.estimateError || data.error;

    data.reason = data.error ? data.error.reason : null;

    const errors = {
      ETH: error.message.includes("funds"),
      OOG: error.message.includes("out of gas"),
      INT:
        error.message.includes("base fee") ||
        error.message.includes("intrinsic"),
      RVT: error.message.includes("revert"),
      BLK: error.message.includes("block gas limit"),
      NCE: error.message.includes("nonce"),
      INV: error.message.includes("invalid opcode"),
      GTH: error.message.includes("always failing transaction")
    };

    let type = Object.keys(errors).find(key => errors[key]);

    switch (type) {
      // `Intrinsic gas too low`
      case "INT":
        return data.gas
          ? this.messages.errors("intWithGas", data)
          : this.messages.errors("intNoGas", data);

      // `Out of gas`
      case "OOG":
        return data.gas && !(data.gas === data.blockLimit)
          ? this.messages.errors("intWithGas", data)
          : this.messages.errors("oogNoGas", data);

      // `Revert`
      case "RVT":
        return data.reason
          ? this.messages.errors("rvtReason", data)
          : this.messages.errors("rvtNoReason", data);

      // `Invalid opcode`
      case "INV":
        return data.reason
          ? this.messages.errors("asrtReason", data)
          : this.messages.errors("asrtNoReason", data);

      // `Exceeds block limit`
      case "BLK":
        return data.gas
          ? this.messages.errors("blockWithGas", data)
          : this.messages.errors("blockNoGas", data);

      // `Insufficient funds`
      case "ETH":
        const balance = await data.contract.web3.eth.getBalance(data.from);
        data.balance = balance.toString();
        return this.messages.errors("noMoney", data);

      // `Invalid nonce`
      case "NCE":
        return this.messages.errors("nonce", data);

      // Generic geth error
      case "GTH":
        return this.messages.errors("geth", data);

      default:
        return this.messages.errors("default", data);
    }
  }

  // ---------------------------- Interaction Handlers ---------------------------------------------

  async acceptDryRun() {
    return this.askBoolean("acceptDryRun");
  }

  // -------------------------  Migration File Handlers --------------------------------------------

  /**
   * Run when a migrations file is loaded, before deployments begin
   * @param  {Object} data
   */
  async preMigrate(data) {
    let message;
    if (data.isFirst) {
      message = this.messages.steps("firstMigrate", data);
      this.deployer.logger.log(message);
    }

    this.summary.push({
      file: data.file,
      deployments: []
    });

    this.currentFileIndex++;

    message = this.messages.steps("preMigrate", data);
    this.deployer.logger.log(message);
  }

  /**
   * Run after a migrations file has completed and the migration has been saved.
   * @param  {Boolean} isLast  true if this the last file in the sequence.
   */
  async postMigrate(isLast) {
    let data = {};
    data.cost = this.getTotals().cost;
    this.summary[this.currentFileIndex].totalCost = data.cost;

    let message = this.messages.steps("postMigrate", data);
    this.deployer.logger.log(message);

    if (isLast) {
      data.totalDeployments = this.getTotals().deployments;
      data.finalCost = this.getTotals().finalCost;

      this.summary.totalDeployments = data.totalDeployments;
      this.summary.finalCost = data.finalCost;

      message = this.messages.steps("lastMigrate", data);
      this.deployer.logger.log(message);
    }
  }

  // ----------------------------  Deployment Handlers --------------------------------------------

  /**
   * Runs after pre-flight estimate has executed, before the sendTx is attempted
   * @param  {Object} data
   */
  async preDeploy(data) {
    let message;
    data.deployed
      ? (message = this.messages.steps("replacing", data))
      : (message = this.messages.steps("deploying", data));

    !this.deployingMany && this.deployer.logger.log(message);
  }

  /**
   * Run at intervals after the sendTx has executed, before the deployment resolves
   * @param  {Object} data
   */
  async block(data) {
    this.currentBlockWait =
      `Blocks: ${data.blocksWaited}`.padEnd(21) +
      `Seconds: ${data.secondsWaited}`;
    if (this.blockSpinner) {
      this.blockSpinner.text = this.currentBlockWait;
    }
  }

  /**
   * Run after a deployment instance has resolved. This handler collects deployment cost
   * data and stores it a `summary` map so that it can later be replayed in an interactive
   * preview (e.g. dry-run --> real). Also passes this data to the messaging utility for
   * output formatting.
   * @param  {Object} data
   */
  async postDeploy(data) {
    let message;
    if (data.deployed) {
      const tx = await data.contract.web3.eth.getTransaction(
        data.receipt.transactionHash
      );

      const block = await data.contract.web3.eth.getBlock(
        data.receipt.blockNumber
      );

      // if geth returns null, try again!
      if (!block) return this.postDeploy(data);

      data.timestamp = block.timestamp;

      const balance = await data.contract.web3.eth.getBalance(tx.from);

      const gasPrice = new web3Utils.BN(tx.gasPrice);
      const gas = new web3Utils.BN(data.receipt.gasUsed);
      const value = new web3Utils.BN(tx.value);
      const cost = gasPrice.mul(gas).add(value);

      data.gasPrice = web3Utils.fromWei(gasPrice, "gwei");
      data.gas = gas.toString(10);
      data.from = tx.from;
      data.value = web3Utils.fromWei(value, "ether");
      data.cost = web3Utils.fromWei(cost, "ether");
      data.balance = web3Utils.fromWei(balance, "ether");

      this.currentGasTotal = this.currentGasTotal.add(gas);
      this.currentCostTotal = this.currentCostTotal.add(cost);
      this.currentAddress = this.from;
      this.deployments++;

      if (this.summary[this.currentFileIndex]) {
        this.summary[this.currentFileIndex].deployments.push(data);
      }

      message = this.messages.steps("deployed", data);
    } else {
      message = this.messages.steps("reusing", data);
    }

    this.deployer.logger.log(message);
  }

  /**
   * Runs on deployment error. Forwards err to the error parser/dispatcher after shutting down
   * any `pending` UI.any `pending` UI. Returns the error message OR logs it out from the reporter
   * if data.log is true.
   * @param  {Object}  data  event args
   * @return {Promise}       resolves string error message
   */
  async deployFailed(data) {
    if (this.blockSpinner) {
      this.blockSpinner.stop();
    }

    const message = await this.processDeploymentError(data);

    return data.log ? this.deployer.logger.error(message) : message;
  }

  // --------------------------  Transaction Handlers  ------------------------------------------

  /**
   * Run on `startTransaction` event. This is fired by migrations on save
   * but could also be fired within a migrations script by a user.
   * @param  {Object} data
   */
  async startTransaction(data) {
    const message = data.message || "Starting unknown transaction...";
    this.deployer.logger.log();

    this.blockSpinner = new ora({
      text: message,
      spinner: indentedSpinner,
      color: "red"
    });

    this.blockSpinner.start();
  }

  /**
   * Run after a start transaction
   * @param  {Object} data
   */
  async endTransaction(data) {
    data.message = data.message || "Ending unknown transaction....";
    const message = this.messages.steps("endTransaction", data);
    this.deployer.logger.log(message);
  }

  // ----------------------------  Library Event Handlers ------------------------------------------
  linking(data) {
    let message = this.messages.steps("linking", data);
    this.deployer.logger.log(message);
  }

  // ----------------------------  PromiEvent Handlers --------------------------------------------

  /**
   * For misc error reporting that requires no context specific UI mgmt
   * @param  {Object} data
   */
  async error(data) {
    const message = this.messages.errors(data.type, data);

    return data.log ? this.deployer.logger.error(message) : message;
  }

  /**
   * Fired on Web3Promievent 'transactionHash' event. Begins running a UI
   * a block / time counter.
   * @param  {Object} data
   */
  async hash(data) {
    if (this.migration.dryRun) return;

    let message = this.messages.steps("hash", data);
    this.deployer.logger.log(message);

    this.currentBlockWait = `Blocks: 0`.padEnd(21) + `Seconds: 0`;

    this.blockSpinner = new ora({
      text: this.currentBlockWait,
      spinner: indentedSpinner,
      color: "red"
    });

    this.blockSpinner.start();
  }

  /**
   * Fired on Web3Promievent 'confirmation' event.
   * @param  {Object} data
   */
  async confirmation(data) {
    let message = this.messages.steps("confirmation", data);
    this.deployer.logger.log(message);
  }
}

module.exports = Reporter;
