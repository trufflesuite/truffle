/**
 * Example reporter class that emulates the classic logger behavior
 */

class Reporter {
  constructor(deployer){
    this.deployingMany = false;
    this.logConfirmations = false;
    this.deployer = deployer;
    this.separator = '\n';
    this.listen();
  }

  listen(){
    this.deployer.emitter.on('preDeploy',       this.preDeploy.bind(this));
    this.deployer.emitter.on('postDeploy',      this.postDeploy.bind(this));
    this.deployer.emitter.on('preDeployMany',   this.preDeployMany.bind(this));
    this.deployer.emitter.on('postDeployMany',  this.postDeployMany.bind(this));
    this.deployer.emitter.on('deployFailed',    this.deployFailed.bind(this));
    this.deployer.emitter.on('linking',         this.linking.bind(this));
    this.deployer.emitter.on('error',           this.error.bind(this));
    this.deployer.emitter.on('transactionHash', this.hash.bind(this));
    this.deployer.emitter.on('receipt',         this.receipt.bind(this));
    this.deployer.emitter.on('confirmation',    this.confirmation.bind(this));
  }

  async preDeploy(payload){
    let message;
    (payload.deployed)
      ? message = this.messages('replacing', payload.contract, payload.deployed)
      : message = this.messages('deploying', payload.contract, payload.deployed);

    !this.deployingMany && this.deployer.logger.log(message);
  }

  async postDeploy(payload){
    let message;
    (payload.deployed)
      ? message = this.messages('deployed', payload.contract.contractName, payload.instance.address)
      : message = this.messages('notDeployed', payload.contract.contractName, payload.instance.address);

    this.deployer.logger.log(message);
  }

  async preDeployMany(batch){
    let message = this.messages('many');

    this.deployingMany = true;
    this.deployer.logger.log(message);

    batch.forEach(item => {
      Array.isArray(item)
        ? message = this.messages('listMany', item[0].contractName)
        : message = this.messages('listMany', item.contractName)

      this.deployer.logger.log(message);
    })

    this.deployer.logger.log(this.separator);
  }

  async postDeployMany(){
    this.deployingMany = false;
  }

  async deployFailed(payload){
    const message = await this.processDeploymentError(payload);
    this.deployer.logger.error(message)
  }

  linking(payload){
    let message = this.messages('linking', payload.libraryName, payload.libraryAddress, payload.contractName);
    this.deployer.logger.log(message);
  }

  async error(payload){
    let message = this.messages(payload.type, payload.contract);
    this.deployer.logger.error(message);
  }

  async hash(payload){
    let message = this.messages('hash', payload.transactionHash, payload.contractName);
    this.deployer.logger.log(message);
  }

  async receipt(payload){
    let message = this.messages('receipt', payload.receipt.gasUsed, payload.contractName);
    this.deployer.logger.log(message);
  }

  async confirmation(payload){
    let message = this.messages('confirmation', payload.num, payload.receipt, payload.contractName);
    this.logConfirmations && this.deployer.logger.log(message);
  }

  underline(msg){
    const ul = '-'.repeat(msg.length);
    return `\n${msg}\n${ul}`;
  }

  messages(kind, ...args){
    const prefix = '\nError:';

    args[0] = args[0] || {};
    args[1] = args[1] || {};
    args[2] = args[2] || {};
    args[3] = args[3] || {};

    const kinds = {

      // --------------------------------------- Errors --------------------------------------------

      noLibName:    `${prefix} Cannot link a library with no name.\n`,
      noLibAddress: `${prefix} "${args[0].contractName}" has no address. Has it been deployed?\n`,

      noBytecode:   `${prefix} "${args[0].contractName}" ` +
                    `is an abstract contract or an interface and cannot be deployed\n` +
                    `   * Hint: just import the contract into the '.sol' file that uses it.\n`,

      intWithGas:   `${prefix} "${args[0].contractName}" ran out of gas ` +
                    `(using a value you set in your network config or deployment parameters.)\n` +
                    `   * Block limit:  ${args[2]}\n` +
                    `   * Gas sent:     ${args[1]}\n`,

      intNoGas:     `${prefix} "${args[0].contractName}" ran out of gas ` +
                    `(using Truffle's estimate.)\n` +
                    `   * Block limit:  ${args[1]}\n` +
                    `   * Gas sent:     ${args[2]}\n` +
                    `   * Try:\n` +
                    `      + Setting a higher gas estimate multiplier for this contract\n` +
                    `      + Using the solc optimizer settings in 'truffle.js'\n` +
                    `      + Making your contract smaller\n` +
                    `      + Making your contract constructor more efficient\n` +
                    `      + Setting a higher network block limit if you are on a\n` +
                    `        private network or test client (like ganache).\n`,

      oogNoGas:     `${prefix} "${args[0].contractName}" ran out of gas. Something in the constructor ` +
                    `(ex: infinite loop) caused gas estimation to fail. Try:\n` +
                    `   * Making your contract constructor more efficient\n` +
                    `   * Setting the gas manually in your config or a deployment parameter\n` +
                    `   * Using the solc optimizer settings in 'truffle.js'\n` +
                    `   * Setting a higher network block limit if you are on a\n` +
                    `     private network or test client (like ganache).\n`,

      rvtReason:    `Revert with string error not implemented yet.`,
      asrtReason:   `Assert with string error not implemented yet.`,

      rvtNoReason:  `${prefix} "${args[0].contractName}" hit a require or revert statement ` +
                    `somewhere in its constructor. Try:\n` +
                    `   * Verifying that your constructor params satisfy all require conditions.\n` +
                    `   * Adding reason strings to your require statements.\n`,

      asrtNoReason: `${prefix} "${args[0].contractName}" hit an invalid opcode while deploying. Try:\n` +
                    `   * Verifying that your constructor params satisfy all assert conditions.\n` +
                    `   * Verifying your constructor code doesn't access an array out of bounds.\n` +
                    `   * Adding reason strings to your assert statements.\n`,

      noMoney:      `${prefix} "${args[0].contractName}" could not deploy due to insufficient funds\n` +
                    `   * Account:  ${args[1]}\n` +
                    `   * Balance:  ${args[2]} wei\n` +
                    `   * Message:  ${args[3]}\n` +
                    `   * Try:\n` +
                    `      + Using an adequately funded account\n` +
                    `      + If you are using a local Geth node, verify that your node is synced.\n`,

      blockWithGas: `${prefix} "${args[0].contractName}" exceeded the block limit ` +
                    `(with a gas value you set).\n` +
                    `   * Block limit:  ${args[2]}\n` +
                    `   * Gas sent:     ${args[1]}\n` +
                    `   * Try:\n` +
                    `      + Sending less gas.\n` +
                    `      + Setting a higher network block limit if you are on a\n` +
                    `        private network or test client (like ganache).\n`,

      blockNoGas:   `${prefix} "${args[0].contractName}" exceeded the block limit ` +
                    `(using Truffle's estimate).\n` +
                    `   * Block limit: ${args[1]}\n` +
                    `   * Report this error in the Truffle issues on Github. It should not happen.\n` +
                    `   * Try: setting gas manually in 'truffle.js' or as parameter to 'deployer.deploy'\n`,

      nonce:        `${prefix} "${args[0].contractName}" received: ${args[1]}.\n` +
                    `   * This error is common when Infura is under heavy network load.\n` +
                    `   * Try: setting the 'confirmations' key in your network config\n` +
                    `          to wait for several block confirmations between each deployment.\n`,

      default:      `${prefix} "${args[0].contractName}" -- ${args[1]}.\n`,

      // ------------------------------------ Successes --------------------------------------------

      deploying:    this.underline('Deploying'),
      replacing:    this.underline('Replacing'),
      reusing:      this.underline('Re-using'),
      many:         this.underline('Deploying Batch'),
      linking:      this.underline('Linking') + '\n' +
                    `${args[2]}`.padEnd(20) + `  > ${args[0]}`.padEnd(25)            + `(${args[1]})`,

      listMany:     `* ${args[0]}`,
      deployed:     `${args[0]}`.padEnd(20) + '  > address:'.padEnd(25)              + args[1],
      hash:         `${args[1]}`.padEnd(20) + '  > transaction hash:'.padEnd(25)     + args[0],
      receipt:      `${args[1]}`.padEnd(20) + '  > gas usage:'.padEnd(25)            + args[0],
      confirmation: `${args[2]}`.padEnd(20) + '  > confirmation number:'.padEnd(25)  + args[0],
    }

    return kinds[kind];
  }

  async processDeploymentError(payload){
    let message;

    const error = payload.estimateError || payload.error;

    const errors = {
      INT: error.message.includes('base fee') || error.message.includes('intrinsic'),
      OOG: error.message.includes('out of gas'),
      RVT: error.message.includes('revert'),
      ETH: error.message.includes('funds'),
      BLK: error.message.includes('block gas limit'),
      NCE: error.message.includes('nonce'),
      INV: error.message.includes('invalid opcode'),
    }

    let type = Object.keys(errors).find(key => errors[key]);

    switch (type) {
      case 'INT':
        (payload.gas)
          ? message = this.messages('intWithGas', payload.contract, payload.gas, payload.blockLimit)
          : message = this.messages('intNoGas', payload.contract, payload.blockLimit, payload.estimate);

        this.deployer.logger.error(message);
        break;

      case 'OOG':
        (payload.gas)
          ? message = this.messages('intWithGas', payload.contract, payload.gas, payload.blockLimit)
          : message = this.messages('oogNoGas', payload.contract, payload.blockLimit, payload.estimate);

        this.deployer.logger.error(message);
        break;

      case 'RVT':
        (payload.reason)
          ? message = this.messages('rvtReason', payload.contract, payload.reason)
          : message = this.messages('rvtNoReason', payload.contract);

        this.deployer.logger.error(message);
        break;

      case 'INV':
        (payload.reason)
          ? message = this.messages('asrtReason', payload.contract, payload.reason)
          : message = this.messages('asrtNoReason', payload.contract);

        this.deployer.logger.error(message);
        break;

      case 'BLK':
        (payload.gas)
          ? message = this.messages('blockWithGas', payload.contract, payload.gas, payload.blockLimit)
          : message = this.messages('blockNoGas', payload.contract, payload.blockLimit)

        this.deployer.logger.error(message);
        break;

      case 'ETH':
        let balance = await payload.contract.web3.eth.getBalance(payload.from);
        balance = balance.toString();
        message = this.messages('noMoney', payload.contract, payload.from, balance, error.message);
        this.deployer.logger.error(message);
        break;

      case 'NCE':
        message = this.messages('nonce', payload.contract, error.message);
        this.deployer.logger.error(message);
        break;

      default:
        message = this.messages('default', payload.contract, error.message);
        this.deployer.logger.error(message);
    }
  }
}

module.exports = Reporter;