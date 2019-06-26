const ENSJS = require("ethereum-ens");

module.exports = {
  getNewENSJS: function(provider) {
    return new ENSJS(provider);
  },

  resolveNameToAddress: function(name, ensjs) {
    return ensjs.resolver(name).addr();
  },

  convertENSNames: function(inputArgs, methodABI, web3) {
    if (methodABI.inputs.length === 0) return inputArgs;
    const { isAddress } = web3.utils;
    const ensjs = this.getNewENSJS(web3.currentProvider);

    const convertedNames = inputArgs.map((argument, index) => {
      if (index === methodABI.inputs.length) {
        // Check the from field on the last argument if present
        if (argument.from && !isAddress(argument.from)) {
          return this.resolveNameToAddress(argument.from, ensjs)
            .then(fromAddress => {
              return Object.assign({}, argument, { from: fromAddress });
            })
            .catch(error => {
              throw error;
            });
        }
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
  }
};
