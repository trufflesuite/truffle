const TruffleContract = require('truffle-contract');
const workflow = require('truffle-workflow-compile');
const path = require('path');
const fs = require('fs-extra');

const utils = {

  miningId: null,

  // Constants
  zeroAddress: '0x0000000000000000000000000000000000000000',

  // Paths
  buildDir: path.join(__dirname, '../build'),
  sourcesDir: path.join(__dirname, '../sources'),

  compile: async function(){
     const config = {
      contracts_build_directory: utils.buildDir,
      contracts_directory: utils.sourcesDir
    };

    return new Promise((accept, reject) => {
      workflow.compile(config, err => err ? reject(err) : accept());
    });
  },

  evm_mine: function(web3){
    return new Promise(function(accept, reject){
      web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_mine",
        id: new Date().getTime()
      }, function(err, result){
          (err) ? reject(err) : accept(result);
      });
    });
  },

  startAutoMine: function(web3, interval){
    utils.miningId = setInterval(async() => {
      await utils.evm_mine(web3);
    }, interval);
  },

  stopAutoMine: () => clearInterval(utils.miningId),

  waitMS: async (ms) => new Promise(resolve => setTimeout(() => resolve(), ms)),

  cleanUp: () => fs.removeSync(utils.buildDir),

  getContract: function(name, provider, networkId, account){
    const json = require(`../build/${name}`);
    const contract = TruffleContract(json);
    contract.setProvider(provider);
    contract.setNetwork(networkId);
    contract.defaults({ from: account });
    return contract;
  },
};

module.exports = utils;
