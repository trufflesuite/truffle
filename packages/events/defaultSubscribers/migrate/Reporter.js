const debug = require("debug")("reporters:migrations:reporter"); // eslint-disable-line no-unused-vars
const web3Utils = require("web3-utils");
const Spinner = require("@truffle/spinners").Spinner;

const Messages = require("./Messages");

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
 */
class Reporter {
  constructor({ subscriber }) {
    this.currentGasTotal = new web3Utils.BN(0);
    this.currentCostTotal = new web3Utils.BN(0);
    this.finalCostTotal = new web3Utils.BN(0);
    this.deployments = 0;
    this.separator = "\n";
    this.summary = [];
    this.currentFileIndex = -1;
    this.currentBlockWait = "";
    this.subscriber = subscriber;

    this.messages = new Messages(this);
  }

  // ------------------------------------  Utilities -----------------------------------------------

  /**
   * Retrieves gas usage totals per migrations file / totals since the reporter
   * started running. Calling this method resets the gas counters for migrations totals
   */
  getTotals(interfaceAdapter) {
    const gas = this.currentGasTotal.toString(10);
    const cost = interfaceAdapter.displayCost(this.currentCostTotal);
    this.finalCostTotal = this.finalCostTotal.add(this.currentCostTotal);

    this.currentGasTotal = new web3Utils.BN(0);
    this.currentCostTotal = new web3Utils.BN(0);

    return {
      gas,
      cost,
      finalCost: interfaceAdapter.displayCost(this.finalCostTotal),
      deployments: this.deployments.toString()
    };
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
        const balance = await data.contract.interfaceAdapter.getBalance(
          data.from
        );
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

  // -------------------------  Migration File Handlers --------------------------------------------

  /**
   * Run when a migrations file is loaded, before deployments begin
   * @param  {Object} data
   */
  async preMigrate(data) {
    let message;
    if (data.isFirst) {
      message = this.messages.steps("firstMigrate", data);
    }

    this.summary.push({
      file: data.file,
      number: data.number,
      deployments: []
    });

    this.currentFileIndex++;

    const messagePart2 = this.messages.steps("preMigrate", data);
    if (message && messagePart2) {
      return message + "\n" + messagePart2;
    } else if (message) {
      return message;
    }
    return messagePart2;
  }

  /**
   * Run after a migrations file has completed and the migration has been saved.
   * @param  {Object} data
   */
  async postMigrate(data) {
    const totals = this.getTotals(data.interfaceAdapter);
    this.summary[this.currentFileIndex].totalCost = totals.cost;

    let messageData = {
      number: this.summary[this.currentFileIndex].number,
      cost: totals.cost,
      valueUnit: this.valueUnit
    };
    let message = this.messages.steps("postMigrate", messageData);

    if (data.isLast) {
      messageData.totalDeployments = totals.deployments;
      messageData.finalCost = totals.finalCost;

      this.summary.totalDeployments = messageData.totalDeployments;
      this.summary.finalCost = messageData.finalCost;

      message += this.messages.steps("lastMigrate", messageData);
    }
    return message;
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

    return message;
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
      const txCostReport =
        await data.contract.interfaceAdapter.getTransactionCostReport(
          data.receipt
        );

      // if it returns null, try again!
      if (!txCostReport) {
        return this.postDeploy(data);
      }

      data = {
        ...data,
        ...txCostReport,
        cost: data.contract.interfaceAdapter.displayCost(txCostReport.cost)
      };

      this.valueUnit = data.valueUnit;
      this.currentGasTotal = this.currentGasTotal.add(txCostReport.gas);
      this.currentCostTotal = this.currentCostTotal.add(txCostReport.cost);
      this.currentAddress = this.from;
      this.deployments++;

      if (this.summary[this.currentFileIndex]) {
        this.summary[this.currentFileIndex].deployments.push(data);
      }

      message = this.messages.steps("deployed", data);
    } else {
      message = this.messages.steps("reusing", data);
    }

    return message;
  }

  /**
   * Runs on deployment error. Forwards err to the error parser/dispatcher after shutting down
   * any `pending` UI.any `pending` UI.
   * @param  {Object}  data  event args
   * @return {Promise}       resolves string error message
   */
  async deployFailed(data) {
    if (this.blockSpinner) {
      this.blockSpinner.fail();
    }

    if (this.transactionSpinner) {
      this.transactionSpinner.fail();
    }
    return await this.processDeploymentError(data);
  }

  // --------------------------  Transaction Handlers  ------------------------------------------

  /**
   * Run on `startTransaction` event. This is fired by migrations on save
   * but could also be fired within a migrations script by a user.
   * @param  {Object} data
   */
  async startTransaction(data) {
    const message = data.message || "Starting unknown transaction...";
    this.transactionSpinner = new Spinner(
      "events:subscribers:migrate:reporter:transactions",
      {
        text: message,
        indent: 3,
        prefixColor: "red"
      }
    );
  }

  /**
   * Run after a start transaction
   * @param  {Object} data
   */
  async endTransaction(data) {
    data.message = data.message || "Ending unknown transaction....";
    const message = this.messages.steps("endTransaction", data);
    this.transactionSpinner.remove();
    return message;
  }

  // ----------------------------  Library Event Handlers ------------------------------------------
  linking(data) {
    return this.messages.steps("linking", data);
  }

  // ----------------------------  PromiEvent Handlers --------------------------------------------

  /**
   * For misc error reporting that requires no context specific UI mgmt
   * @param  {Object} data
   */
  async error(data) {
    return this.messages.errors(data.type, data);
  }

  /**
   * Fired on Web3Promievent 'transactionHash' event. Begins running a UI
   * a block / time counter.
   * @param  {Object} data
   */
  async txHash(data) {
    if (this.subscriber.config.dryRun) {
      return;
    }

    let message = this.messages.steps("hash", data);
    this.subscriber.logger.log(message);

    this.currentBlockWait = `Blocks: 0`.padEnd(21) + `Seconds: 0`;

    this.blockSpinner = new Spinner("events:subscribers:migrate:reporter", {
      text: this.currentBlockWait,
      indent: 3,
      prefixColor: "red"
    });
  }

  /**
   * Fired on Web3Promievent 'confirmation' event.
   * @param  {Object} data
   */
  async confirmation(data) {
    return this.messages.steps("confirmation", data);
  }
}

module.exports = Reporter;
