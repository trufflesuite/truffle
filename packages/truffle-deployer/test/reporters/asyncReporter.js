/**
 * Example reporter for testing async remote control of a deployer
 * via the `preDeploy`, `postDeploy` and `link` events.
 */

class AsyncReporter {
  constructor(deployer, web3, mine){
    this.blocks = [];
    this.deployer = deployer;
    this.mine = mine;
    this.web3 = web3;
    this.listen();
  }

  async mineAndRecordBlock(name, args){
    if (name === 'postDeploy'){
      await this.mine(this.web3);
      await this.mine(this.web3);
      const blockNumber = await this.web3.eth.getBlockNumber();
      this.blocks.unshift(blockNumber);
    } else if (name === 'confirmation'){
      // etc
    }
  }

  listen(){
    this.deployer.emitter.on('preDeploy',       this.mineAndRecordBlock.bind(this, 'preDeploy'));
    this.deployer.emitter.on('postDeploy',      this.mineAndRecordBlock.bind(this, 'postDeploy'));
    this.deployer.emitter.on('linking',         this.mineAndRecordBlock.bind(this, 'linking'));
    this.deployer.emitter.on('error',           this.mineAndRecordBlock.bind(this, 'error'));
    this.deployer.emitter.on('receipt',         this.mineAndRecordBlock.bind(this, 'receipt'));
    this.deployer.emitter.on('transactionHash', this.mineAndRecordBlock.bind(this, 'transactionHash'));
    this.deployer.emitter.on('confirmation',    this.mineAndRecordBlock.bind(this, 'confirmation'));
  }
}

module.exports = AsyncReporter;
