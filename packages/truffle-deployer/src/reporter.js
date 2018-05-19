/**
 * Example logger class that emulates the classic logger behavior
 * and allows for optional async handling for tests
 */

class Logger {
  constructor(deployer, async){
    (async)
      ? deployer.setAsyncHandler(this.asyncHandler)
      : deployer.setAsyncHandler(null);

    this.listen();
  }

  listen(){
    deployer.on('preDeploy',       this.preDeploy);
    deployer.on('postDeploy',      this.postDeploy);
    deployer.on('linking',         this.linking);
    deployer.on('error',           this.error);
    deployer.on('transactionHash', this.hash);
    deployer.on('confirmation',    this.confirmation);
    deployer.on('step',            this.step);
  }

  async asyncHandler(err, name, ...args){

  }

  preDeploy(contract, deployed){
    let message;
    (deployed)
      ? message = this.messages('replacing', contract)
      : message = this.messages('deploying', contract);

    deployer.logger.log(message);
  })

  postDeploy(contract, instance, deployed){
    let message;
    (deployed)
      ? message = this.messages('deployed', contract, instance)
      : message = this.messages('notDeployed', contract, instance);

    deployer.logger.log(message);
  })

  linking(library, destination){
    let message = this.messages('linking', library, destination);
    deployer.logger.log(message);
  })

  step(){
    let message = this.messages('step');
    deployer.logger.log(message);
  }

  error(type, contract){
    let message = this.messages(type, contract);
    deployer.logger.log(message);
  })

  transactionHash(){}
  confirmation(){}

  messages(kind, ...args){
    const kinds = {
      noLibName:    `Link error: Cannot link a library with no name.`,
      noLibAddress: `Link error: ${library.contract_name} has no address. Has it been deployed?`
      deploying:    `Deploying ${args[0].contract_name}...`,
      replacing:    `Replacing ${args[0].contract_name}...`,
      deployed:     `${args[0].contract_name}: ${args[1].address}`,
      notDeployed:  `Didn't deploy ${args[0].contract_name}; using ${args[1].address}`,
      linking:      `Linking ${args[0].contract_name} ${args[1].contract_name}`
    }
    return kinds[kind];
  }
}