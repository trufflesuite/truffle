const RevertWithReason = artifacts.require("RevertWithReason");

module.exports = async function(deployer, network, accounts) {
  await deployer.deploy(RevertWithReason);
};