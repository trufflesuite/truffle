const ENSJS = require("ethereum-ens");

module.exports = {
  convertENSNames: async function({ inputArgs, methodABI, inputParams, web3 }) {
    let args;
    if (inputArgs.length && methodABI) {
      args = await this.convertENSArgsNames(inputArgs, methodABI, web3);
    } else {
      args = inputArgs;
    }
    const params = await this.connvertENSParamsNames(inputParams, web3);
    return { args, params };
  },

  getNewENSJS: function(provider) {
    return new ENSJS(provider);
  },

  resolveNameToAddress: function(name, ensjs) {
    return ensjs.resolver(name).addr();
  },

  convertENSArgsNames: function(inputArgs, methodABI, web3) {
    if (methodABI.inputs.length === 0) return inputArgs;
    const { isAddress } = web3.utils;
    const ensjs = this.getNewENSJS(web3.currentProvider);

    const convertedNames = inputArgs.map((argument, index) => {
      if (index + 1 > methodABI.inputs.length) {
        return argument;
      } else if (methodABI.inputs[index].type === "address") {
        // Check all address arguments for ENS names
        const argIsAddress = isAddress(argument);
        if (argIsAddress) return argument;
        return this.resolveNameToAddress(argument, ensjs);
      } else {
        return argument;
      }
    });
    return Promise.all(convertedNames);
  },

  convertENSParamsNames: async function(params, web3) {
    const { isAddress } = web3.utils;
    if (params.from && !isAddress(params.from)) {
      const ensjs = this.getNewENSJS(web3.currentProvider);
      const newFrom = await this.resolveNameToAddress(params.from, ensjs);
      return Object.assign({}, params, { from: newFrom });
    } else {
      return params;
    }
  }
};
