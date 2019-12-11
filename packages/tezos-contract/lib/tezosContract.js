const debug = require("debug")("tezos-contract:contract"); // eslint-disable-line no-unused-vars
let Web3 = require("web3");
const execute = require("./execute");
const {
  bootstrap,
  constructorMethods,
  properties
} = require("./contract/index");

// For browserified version. If browserify gave us an empty version,
// look for the one provided by the user.
if (typeof Web3 === "object" && Object.keys(Web3).length === 0) {
  Web3 = global.Web3;
}

(function(module) {
  // Accepts a contract object created with web3.tez.originate,
  // or an address (web3.tez.contract.at).
  function Contract(contract) {
    var instance = this;
    var constructor = instance.constructor;

    // Core:
    instance.methods = {};
    instance.address = contract.address;
    instance.transactionHash = contract.transactionHash;
    instance.contract = contract;

    // User defined methods
    // TODOS: overloaded methods not currently supported in ligo,
    // events not currently supported in Tezos (as of writing this comment)
    for (const method in contract.methods) {
      const loadMethod = tezosMethod => {
        let fn;

        fn = execute.send.call(
          constructor,
          tezosMethod,
          method,
          instance.address
        );

        // TODO: views not supported in Tezos (as of writing this comment)
        /*
        fn.call = execute.call.call(
          constructor,
          tezosMethod,
          method,
          instance.address
        );
        */

        fn.sendTransaction = execute.send.call(
          constructor,
          tezosMethod,
          method,
          instance.address
        );

        // TODO: Taquito supports, not yet implemented here
        /*
        fn.estimateGas = execute.estimate.call(
          constructor,
          tezosMethod,
          method,
          instance.address
        );
        */

        // TODO: not supported in Tezos (as of writing this comment)
        // also currently useless in @truffle/contract
        /*
        fn.request = execute.request.call(
          constructor,
          tezosMethod,
          method,
          instance.address
        );
        */

        return fn;
      };

      // Only define methods once.
      if (instance[method] === undefined) {
        instance[method] = loadMethod(contract.methods[method]);
      }

      // TODO: not supported in ligo (as of writing this comment)
      // Overloaded methods should be invoked via the .methods property
      /*
        instance.methods[signature] = loadMethod(
          contract.methods[signature]
        );
      */
    }

    instance.storage = () => {
      return instance.contract.storage();
    };

    // Prefer user defined `send`
    if (!instance.send) {
      instance.send = async (value, txParams = {}) => {
        const packet = Object.assign(
          { to: instance.address, amount: value },
          txParams
        );
        let op;

        // NOTE: this will only work if the contract parameter is type Unit!!!
        try {
          op = await instance.constructor.web3.tez.contract.transfer(packet);
        } catch (error) {
          console.error(
            `\nTo transfer tez, contract parameter must be type unit.`
          );
          throw error;
        }

        await op.confirmation();
        return op;
      };
    }

    // fallback
    if (instance.main) instance.sendTransaction = instance.main;
    else instance.sendTransaction = instance.send;

    // TODO: events not supported in Tezos (as of writing this comment)
    // Other events
    //instance.allEvents = execute.allEvents.call(constructor, contract);
    //instance.getPastEvents = execute.getPastEvents.call(constructor, contract);
  }

  Contract._constructorMethods = constructorMethods(Contract);

  // Getter functions are scoped to Contract object.
  Contract._properties = properties;

  bootstrap(Contract);
  module.exports = Contract;

  return Contract;
})(module || {});
