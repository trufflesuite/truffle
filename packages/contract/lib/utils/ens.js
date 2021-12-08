const { default: ENSJS, getEnsAddress } = require("@ensdomains/ensjs");
const { isAddress } = require("web3-utils");

module.exports = {
  convertENSNames: async function ({
    ens,
    inputArgs,
    methodABI,
    inputParams,
    web3,
    networkId
  }) {
    const { registryAddress } = ens;
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

  resolveNameToAddress: async function ({
    name,
    provider,
    registryAddress,
    networkId
  }) {
    let ensjs;
    try {
      ensjs = this.getNewENSJS({
        provider,
        registryAddress,
        networkId
      });
    } catch (error) {
      const message =
        "There was a problem initializing the ENS library." +
        "Please ensure you have the address of the registry set correctly." +
        ` Truffle is currently using ${registryAddress}.`;
      throw new Error(`${message} - ${error.message}`);
    }
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

    const convertedNames = inputArgs.map((argument, index) => {
      if (index + 1 > methodABI.inputs.length) {
        return argument;
      } else if (methodABI.inputs[index].type === "address") {
        // Check all address arguments for ENS names
        const argIsAddress = isAddress(argument);
        if (argIsAddress) return argument;
        return this.resolveNameToAddress({
          name: argument,
          provider: web3.currentProvider,
          registryAddress,
          networkId
        });
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
    let outputParams = inputParams;
    if (inputParams.from && !isAddress(inputParams.from)) {
      const newFrom = await this.resolveNameToAddress({
        name: inputParams.from,
        provider: web3.currentProvider,
        networkId,
        registryAddress
      });
      outputParams = {
        ...outputParams,
        from: newFrom
      };
    }
    if (inputParams.accessList && Array.isArray(inputParams.accessList)) {
      const newAccessList = await Promise.all(
        inputParams.accessList.map(async (entry) => {
          if (entry && entry.address && !isAddress(entry.address)) {
            const newAddress = await this.resolveNameToAddress({
              name: entry.address,
              provider: web3.currentProvider,
              networkId,
              registryAddress
            });
            return {
              ...entry,
              address: newAddress
            };
          } else {
            return entry;
          }
        })
      );
      outputParams = {
        ...outputParams,
        accessList: newAccessList
      };
    }
    return outputParams;
  }
};
