const { default: ENSJS, getEnsAddress } = require("@ensdomains/ensjs");
const { isAddress } = require("web3-utils");

module.exports = {
  convertENSNames: async function ({
    ensSettings,
    inputArgs,
    methodABI,
    inputParams,
    web3,
    networkId
  }) {
    const { registryAddress } = ensSettings;
    let args;
    if (inputArgs.length && methodABI) {
      args = await this.convertENSArgsNames({
        inputArgs,
        methodABI,
        web3,
        registryAddress,
        networkId
      });
    } else {
      args = inputArgs;
    }
    let params;
    if (inputParams) {
      params = await this.convertENSParamsNames({
        inputParams,
        web3,
        registryAddress,
        networkId
      });
    }
    return { args, params };
  },

  getNewENSJS: function ({ provider, registryAddress, networkId }) {
    return new ENSJS({
      provider,
      ensAddress: registryAddress || getEnsAddress(networkId)
    });
  },

  resolveNameToAddress: async function (name, ensjs) {
    return await ensjs.name(name).getAddress("ETH");
  },

  convertENSArgsNames: function ({
    inputArgs,
    methodABI,
    web3,
    registryAddress,
    networkId
  }) {
    if (methodABI.inputs.length === 0) return inputArgs;
    const ensjs = this.getNewENSJS({
      provider: web3.currentProvider,
      registryAddress,
      networkId
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

  convertENSParamsNames: async function ({
    inputParams,
    web3,
    registryAddress,
    networkId
  }) {
    if (inputParams.from && !isAddress(inputParams.from)) {
      const ensjs = this.getNewENSJS({
        provider: web3.currentProvider,
        registryAddress,
        networkId
      });
      const newFrom = await this.resolveNameToAddress(inputParams.from, ensjs);
      return {
        ...inputParams,
        from: newFrom
      };
    } else {
      return inputParams;
    }
  }
};
