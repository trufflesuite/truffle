const ENSJS = require("ethereum-ens");
const { isAddress } = require("web3-utils");

module.exports = {
  convertENSNames: async function({
    ensSettings,
    inputArgs,
    methodABI,
    inputParams,
    web3
  }) {
    const { registryAddress } = ensSettings;
    let args;
    if (inputArgs.length && methodABI) {
      args = await this.convertENSArgsNames(
        inputArgs,
        methodABI,
        web3,
        registryAddress
      );
    } else {
      args = inputArgs;
    }
    const params = await this.convertENSParamsNames(
      inputParams,
      web3,
      registryAddress
    );
    return { args, params };
  },

  getNewENSJS: function({ provider, registryAddress }) {
    return new ENSJS(provider, registryAddress);
  },

  resolveNameToAddress: function(name, ensjs) {
    return ensjs.resolver(name).addr();
  },

  convertENSArgsNames: function(inputArgs, methodABI, web3, registryAddress) {
    if (methodABI.inputs.length === 0) return inputArgs;
    const ensjs = this.getNewENSJS({
      provider: web3.currentProvider,
      registryAddress
    });

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

  convertENSParamsNames: async function(params, web3, registryAddress) {
    if (params.from && !isAddress(params.from)) {
      const ensjs = this.getNewENSJS({
        provider: web3.currentProvider,
        registryAddress
      });
      const newFrom = await this.resolveNameToAddress(params.from, ensjs);
      return Object.assign({}, params, { from: newFrom });
    } else {
      return params;
    }
  }
};
