/**
 * Example reporter class that emulates the classic logger behavior
 */

class SyncReporter {
  constructor(deployer){
    this.deployer = deployer;
    this.listen();
  }

  listen(){
    this.deployer.emitter.on('preDeploy',       this.preDeploy.bind(this));
    this.deployer.emitter.on('postDeploy',      this.postDeploy.bind(this));
    this.deployer.emitter.on('linking',         this.linking.bind(this));
    this.deployer.emitter.on('error',           this.error.bind(this));
    this.deployer.emitter.on('transactionHash', this.hash.bind(this));
    this.deployer.emitter.on('confirmation',    this.confirmation.bind(this));
  }

  preDeploy(payload){
    let message;
    (payload.deployed)
      ? message = this.messages('replacing', payload.contract, payload.deployed)
      : message = this.messages('deploying', payload.contract, payload.deployed);

    this.deployer.logger.log(message);
  }

  postDeploy(payload){
    let message;
    (payload.deployed)
      ? message = this.messages('deployed', payload.contract, payload.instance)
      : message = this.messages('notDeployed', payload.contract, payload.instance);

    this.deployer.logger.log(message);
  }

  linking(payload){
    let message = this.messages('linking', payload.library, payload.destination);
    this.deployer.logger.log(message);
  }

  error(payload){
    let message = this.messages(payload.type, payload.contract);
    this.deployer.logger.log(message);
  }

  hash(payload){
    let message = this.messages('hash', payload.transactionHash);
    this.deployer.logger.log(message);
  }

  confirmation(payload){
    let message = this.messages('confirmation', payload.num, payload.receipt);
    this.deployer.logger.log(message);
  }

  messages(kind, ...args){
    args[0] = args[0] || {};
    args[1] = args[1] || {};

    const kinds = {
      noLibName:    `Link error: Cannot link a library with no name.`,
      noLibAddress: `Link error: ${args[0].contractName} has no address. Has it been deployed?`,
      deploying:    `Deploying ${args[0].contractName}...`,
      replacing:    `Replacing ${args[0].contractName}...`,
      deployed:     `${args[0].contractName}: ${args[1].address}`,
      notDeployed:  `Didn't deploy ${args[0].contractName}; using ${args[1].address}`,
      linking:      `Linking ${args[0].contractName} ${args[1].contract_name}`,
      hash:         `Transaction: ${args[0]}`,
      confirmation: `Confirmation number: ${args[0]}`,
    }

    return kinds[kind];
  }
}

module.exports = SyncReporter;