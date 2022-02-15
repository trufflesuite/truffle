module.exports = function (contract, args, deployer) {
  return async function () {
    if (deployer.options.events) {
      await deployer.options.events.emit("deployment:newContract", {
        contract
      });
    }
    return contract.new.apply(contract, args);
  };
};
