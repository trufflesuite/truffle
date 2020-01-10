const execute = require("../execute");

const loadTezosContract = (instance, constructor, contract) => {
  instance.address = contract.address;

  // User defined methods
  // NOTE: overloaded methods not currently supported in ligo,
  // events not currently supported in Tezos (as of writing this comment)
  for (const method in contract.methods) {
    const loadMethod = tezosMethod => {
      let fn;

      fn = execute.sendTezos.call(
        constructor,
        tezosMethod,
        method,
        instance.address
      );

      // NOTE: views not supported in Tezos (as of writing this comment)
      /*
        fn.call = execute.call.call(
          constructor,
          tezosMethod,
          method,
          instance.address
        );
        */

      fn.sendTransaction = execute.sendTezos.call(
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

      // NOTE: current request functionality not supported in Tezos
      // (as of writing this comment).
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

    // NOTE: function signatures & ABI output not supported in ligo (as of writing this comment)
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
        op = await constructor.interfaceAdapter.tezos.contract.transfer(packet);
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

  // NOTE: events not supported in Tezos (as of writing this comment)
  // Other events
  //instance.allEvents = execute.allEvents.call(constructor, contract);
  //instance.getPastEvents = execute.getPastEvents.call(constructor, contract);

  return instance;
};

module.exports = loadTezosContract;
