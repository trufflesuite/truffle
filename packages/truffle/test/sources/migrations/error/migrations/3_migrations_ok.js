const UsesExample = artifacts.require("UsesExample");

module.exports = async function(deployer, network, accounts) {
  await deployer.deploy(UsesExample, accounts[1]);
};
