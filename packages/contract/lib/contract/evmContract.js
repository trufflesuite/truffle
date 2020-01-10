const web3Utils = require("web3-utils");
const execute = require("../execute");

const loadEvmContract = (instance, constructor, contract) => {
  instance.address = contract.options.address;

  // User defined methods, overloaded methods, events
  instance.abi.forEach(item => {
    switch (item.type) {
      case "function":
        let isConstant =
          ["pure", "view"].includes(item.stateMutability) || item.constant; // new form // deprecated case

        const signature = web3Utils._jsonInterfaceMethodToString(item);

        const method = (constant, web3Method) => {
          let fn;

          constant
            ? (fn = execute.call.call(
                constructor,
                web3Method,
                item,
                instance.address
              ))
            : (fn = execute.sendEvm.call(
                constructor,
                web3Method,
                item,
                instance.address
              ));

          fn.call = execute.call.call(
            constructor,
            web3Method,
            item,
            instance.address
          );
          fn.sendTransaction = execute.sendEvm.call(
            constructor,
            web3Method,
            item,
            instance.address
          );
          fn.estimateGas = execute.estimate.call(
            constructor,
            web3Method,
            item,
            instance.address
          );
          fn.request = execute.request.call(
            constructor,
            web3Method,
            item,
            instance.address
          );

          return fn;
        };

        // Only define methods once. Any overloaded methods will have all their
        // accessors available by ABI signature available on the `methods` key below.
        if (instance[item.name] === undefined) {
          instance[item.name] = method(isConstant, contract.methods[item.name]);
        }

        // Overloaded methods should be invoked via the .methods property
        instance.methods[signature] = method(
          isConstant,
          contract.methods[signature]
        );
        break;

      case "event":
        instance[item.name] = execute.event.call(
          constructor,
          contract.events[item.name]
        );
        break;
    }
  });

  // sendTransaction / send
  instance.sendTransaction = execute.sendEvm.call(
    constructor,
    null,
    null,
    instance.address
  );

  // Prefer user defined `send`
  if (!instance.send) {
    instance.send = (value, txParams = {}) => {
      const packet = Object.assign({ value: value }, txParams);
      return instance.sendTransaction(packet);
    };
  }

  // Other events
  instance.allEvents = execute.allEvents.call(constructor, contract);
  instance.getPastEvents = execute.getPastEvents.call(constructor, contract);

  return instance;
};

module.exports = loadEvmContract;
