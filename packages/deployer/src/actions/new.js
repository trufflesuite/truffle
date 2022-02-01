module.exports = function (contract, args, deployer) {
  return async function () {
    if (deployer.options.events) {
      await deployer.options.events.emit("deployment:newContract", {
        contract
      });
    }
    // Evaluate any arguments if they're promises
    await Promise.all(args);
    return contract.new.apply(contract, args);
  };
};
