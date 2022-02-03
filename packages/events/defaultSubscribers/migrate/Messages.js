/**
 *  A module that formats output for the Migrations reporter.
 */
class Messages {
  constructor(reporter) {
    this.reporter = reporter;
  }

  // ----------------------------------- Utilities -------------------------------------------------

  underline(msg) {
    return typeof msg === "number"
      ? `   ${"-".repeat(msg)}`
      : `\n   ${msg}\n   ${"-".repeat(msg.length)}`;
  }

  doubleline(msg) {
    const ul = "=".repeat(msg.length);
    return `\n${msg}\n${ul}`;
  }

  // Emoji alternative
  onMissing() {
    return "**";
  }

  migrationStatus(msg) {
    return `MIGRATION_STATUS:${JSON.stringify(msg)}`;
  }

  decAndHex(num) {
    return `${Number(num).toString(10)} (0x${Number(num).toString(16)})`;
  }

  // ----------------------------------  Errors ----------------------------------------------------

  errors(kind, data) {
    const prefix = " *** Deployment Failed ***\n\n";

    const kinds = {
      migrateErr: () =>
        `\nExiting: Review successful transactions manually by checking the transaction hashes ` +
        `above on Etherscan.\n`,

      noLibName: () => `${prefix}Cannot link a library with no name.\n`,

      noLibAddress: () =>
        `${prefix}"${data.contract.contractName}" has no address. Has it been deployed?\n`,

      noBytecode: () =>
        `${prefix}"${data.contract.contractName}" ` +
        `is an abstract contract or an interface and cannot be deployed.\n` +
        `   * Import abstractions into the '.sol' file that uses them instead of deploying them separately.\n` +
        `   * Contracts that inherit an abstraction must implement all its method signatures exactly.\n` +
        `   * A contract that only implements part of an inherited abstraction is also considered abstract.\n`,

      noBatches: () =>
        `Support for batch deployments (array syntax) is deprecated. ` +
        `Please deploy each contract individually.`,

      intWithGas: () =>
        `${prefix}"${data.contract.contractName}" ran out of gas ` +
        `(using a value you set in your network config or deployment parameters.)\n` +
        `   * Block limit:  ${this.decAndHex(data.blockLimit)}\n` +
        `   * Gas sent:     ${this.decAndHex(data.gas)}\n`,

      intNoGas: () =>
        `${prefix}"${data.contract.contractName}" ran out of gas ` +
        `(using Truffle's estimate.)\n` +
        `   * Block limit:  ${this.decAndHex(data.blockLimit)}\n` +
        `   * Gas sent:     ${this.decAndHex(data.estimate)}\n` +
        `   * Try:\n` +
        `      + Setting a higher gas estimate multiplier for this contract\n` +
        `      + Using the solc optimizer settings in 'truffle-config.js'\n` +
        `      + Making your contract smaller\n` +
        `      + Making your contract constructor more efficient\n` +
        `      + Setting a higher network block limit if you are on a\n` +
        `        private network or test client (like ganache).\n`,

      oogNoGas: () =>
        `${prefix}"${data.contract.contractName}" ran out of gas. Something in the constructor ` +
        `(ex: infinite loop) caused gas estimation to fail. Try:\n` +
        `   * Making your contract constructor more efficient\n` +
        `   * Setting the gas manually in your config or as a deployment parameter\n` +
        `   * Using the solc optimizer settings in 'truffle-config.js'\n` +
        `   * Setting a higher network block limit if you are on a\n` +
        `     private network or test client (like ganache).\n`,

      rvtReason: () =>
        `${prefix}"${data.contract.contractName}" hit a require or revert statement ` +
        `with the following reason given:\n` +
        `   * ${data.reason}\n`,

      rvtNoReason: () =>
        `${prefix}"${data.contract.contractName}" hit a require or revert statement ` +
        `somewhere in its constructor. Try:\n` +
        `   * Verifying that your constructor params satisfy all require conditions.\n` +
        `   * Adding reason strings to your require statements.\n`,

      asrtNoReason: () =>
        `${prefix}"${data.contract.contractName}" hit an invalid opcode while deploying. Try:\n` +
        `   * Verifying that your constructor params satisfy all assert conditions.\n` +
        `   * Verifying your constructor code doesn't access an array out of bounds.\n` +
        `   * Adding reason strings to your assert statements.\n`,

      noMoney: () =>
        `${prefix}"${data.contract.contractName}" could not deploy due to insufficient funds\n` +
        `   * Account:  ${data.from}\n` +
        `   * Balance:  ${data.balance} wei\n` +
        `   * Message:  ${data.error.message}\n` +
        `   * Try:\n` +
        `      + Using an adequately funded account\n` +
        `      + If you are using a local Geth node, verify that your node is synced.\n`,

      blockWithGas: () =>
        `${prefix}"${data.contract.contractName}" exceeded the block limit ` +
        `(with a gas value you set).\n` +
        `   * Block limit:  ${this.decAndHex(data.blockLimit)}\n` +
        `   * Gas sent:     ${this.decAndHex(data.gas)}\n` +
        `   * Try:\n` +
        `      + Sending less gas.\n` +
        `      + Setting a higher network block limit if you are on a\n` +
        `        private network or test client (like ganache).\n`,

      blockNoGas: () =>
        `${prefix}"${data.contract.contractName}" exceeded the block limit ` +
        `(using Truffle's estimate).\n` +
        `   * Block limit: ${this.decAndHex(data.blockLimit)}\n` +
        `   * Report this error in the Truffle issues on Github. It should not happen.\n` +
        `   * Try: setting gas manually in 'truffle-config.js' or as parameter to 'deployer.deploy'\n`,

      nonce: () =>
        `${prefix}"${data.contract.contractName}" received: ${data.error.message}.\n` +
        `   * This error is common when Infura is under heavy network load.\n` +
        `   * Try: setting the 'confirmations' key in your network config\n` +
        `          to wait for several block confirmations between each deployment.\n`,

      geth: () =>
        `${prefix}"${data.contract.contractName}" received a generic error from Geth that\n` +
        `can be caused by hitting revert in a contract constructor or running out of gas.\n` +
        `   * ${data.estimateError.message}.\n` +
        `   * Try: + using the '--dry-run' option to reproduce this failure with clearer errors.\n` +
        `          + verifying that your gas is adequate for this deployment.\n`,

      default: () =>
        `${prefix}"${data.contract.contractName}" -- ${data.error.message}.\n`
    };

    return kinds[kind]();
  }

  // ----------------------------------  Steps ----------------------------------------------------

  steps(kind, data) {
    const self = this;
    const reporter = self.reporter;
    const valueUnit = data.valueUnit || "ETH";

    const kinds = {
      // Deployments
      deploying: () => {
        let output = "";

        if (reporter.subscriber.config.describeJson) {
          output +=
            self.migrationStatus({
              status: "deploying",
              data: {
                contractName: data.contract.contractName
              }
            }) + "\n";
        }

        output += self.underline(`Deploying '${data.contract.contractName}'`);

        return output;
      },

      replacing: () => {
        let output = "";

        if (reporter.subscriber.config.describeJson) {
          output +=
            self.migrationStatus({
              status: "replacing",
              data: {
                contractName: data.contract.contractName,
                priorAddress: data.contract.address
              }
            }) + "\n";
        }

        output += self.underline(`Replacing '${data.contract.contractName}'`);

        return output;
      },

      reusing: () => {
        let output = "";

        if (reporter.subscriber.config.describeJson) {
          output +=
            self.migrationStatus({
              status: "reusing",
              data: {
                contractName: data.contract.contractName,
                address: data.contract.address
              }
            }) + "\n";
        }

        output +=
          self.underline(`Re-using deployed '${data.contract.contractName}'`) +
          "\n" +
          `   > ${"contract address:".padEnd(20)} ${data.contract.address}\n`;

        return output;
      },

      deployed: () => {
        let stopText;
        if (reporter.blockSpinner) {
          reporter.blockSpinner.stop();
          stopText = `   > ${reporter.currentBlockWait}`;
        }

        let output = "";

        if (!reporter.subscriber.config.dryRun)
          output += `   > ${"contract address:".padEnd(20)} ${
            data.receipt.contractAddress
          }\n`;

        output += `   > ${"block number:".padEnd(20)} ${
          data.receipt.blockNumber
        }\n`;

        output += `   > ${"block timestamp:".padEnd(20)} ${data.timestamp}\n`;

        output +=
          `   > ${"account:".padEnd(20)} ${data.from}\n` +
          `   > ${"balance:".padEnd(20)} ${data.balance}\n` +
          `   > ${"gas used:".padEnd(20)} ${self.decAndHex(data.gas)}\n` +
          `   > ${"gas price:".padEnd(20)} ${data.gasPrice} ${data.gasUnit}\n` +
          `   > ${"value sent:".padEnd(20)} ${data.value} ${valueUnit}\n` +
          `   > ${"total cost:".padEnd(20)} ${data.cost} ${valueUnit}\n`;

        if (
          reporter.subscriber.config.confirmations !== undefined &&
          reporter.subscriber.config.confirmations !== 0
        )
          output += self.underline(
            `Pausing for ${reporter.subscriber.config.confirmations} confirmations...\n`
          );

        if (reporter.subscriber.config.describeJson) {
          output += self.migrationStatus({
            status: "deployed",
            data: Object.assign({}, data, {
              contract: {
                contractName: data.contract.contractName,
                address: data.receipt.contractAddress
              },
              instance: undefined,
              receipt: {
                transactionHash: data.receipt.transactionHash,
                gasUsed: data.receipt.gasUsed
              }
            })
          });
        }

        return stopText ? stopText + "\n" + output : output;
      },

      // Transactions
      endTransaction: () => {
        if (reporter.blockSpinner) reporter.blockSpinner.stop();
        return `   > ${data.message}`;
      },

      // Libraries
      linking: () => {
        let output =
          self.underline(`Linking`) +
          `\n   * Contract: ${data.contractName} <--> Library: ${data.libraryName} `;

        if (!reporter.subscriber.config.dryRun)
          output += `(at address: ${data.libraryAddress})`;

        return output;
      },

      // PromiEvents
      hash: () =>
        `   > ${"transaction hash:".padEnd(20)} ` + data.transactionHash,

      receipt: () => `   > ${"gas usage:".padEnd(20)} ` + data.gas,

      confirmation: () =>
        `   > ${"confirmation number:".padEnd(20)} ` +
        `${data.num} (block: ${data.block})`,

      // Migrator
      preAllMigrations: () => {
        let output = "";

        if (reporter.subscriber.config.describeJson) {
          const migrations = data.migrations.map(migration =>
            migration.serializeable()
          );
          output += self.migrationStatus({
            status: "preAllMigrations",
            data: Object.assign({}, data, {
              migrations
            })
          });
        }

        return output;
      },

      postAllMigrations: () => {
        let output = "";

        if (reporter.subscriber.config.describeJson) {
          output += self.migrationStatus({
            status: "postAllMigrations",
            data
          });
        }

        return output;
      },

      // Migrations
      preMigrate: () => {
        let output = "";
        if (reporter.subscriber.config.describeJson) {
          output +=
            self.migrationStatus({
              status: "preMigrate",
              data
            }) + "\n";
        }

        output += self.doubleline(`${data.file}`);
        return output;
      },

      saving: () => `\n   * Saving migration`,

      firstMigrate: () => {
        let output = ``;
        reporter.subscriber.config.dryRun
          ? (output +=
              self.doubleline(`Migrations dry-run (simulation)`) + "\n")
          : (output += self.doubleline(`Starting migrations...`) + "\n");

        output +=
          `> Network name:    '${data.network}'\n` +
          `> Network id:      ${data.networkId}\n` +
          `> Block gas limit: ${self.decAndHex(data.blockLimit)}\n`;
        return output;
      },

      postMigrate: () => {
        let output = "";
        let deployments =
          self.reporter.summary[self.reporter.currentFileIndex].deployments;

        if (!self.reporter.subscriber.config.dryRun && deployments.length)
          output += `   > Saving artifacts\n`;

        output +=
          self.underline(37) +
          "\n" +
          `   > ${"Total cost:".padEnd(15)} ${data.cost.padStart(
            15
          )} ${valueUnit}\n`;

        if (self.reporter.subscriber.config.describeJson) {
          output +=
            "\n" +
            self.migrationStatus({
              status: "postMigrate",
              data
            }) +
            "\n";
        }

        return output;
      },

      lastMigrate: () => {
        let output = "";

        output +=
          self.doubleline("Summary") +
          "\n" +
          `> ${"Total deployments:".padEnd(20)} ${data.totalDeployments}\n` +
          `> ${"Final cost:".padEnd(20)} ${data.finalCost} ${valueUnit}\n`;

        if (self.reporter.subscriber.config.describeJson) {
          output +=
            "\n" +
            self.migrationStatus({
              status: "lastMigrate",
              data: {
                totalDeployments: data.totalDeployments,
                finalCost: data.finalCost
              }
            }) +
            "\n";
        }

        return output;
      },

      // Batch
      many: () => self.underline(`Deploying Batch`),

      listMany: () => `   * ${data.contractName}`
    };

    return kinds[kind]();
  }
}

module.exports = Messages;
