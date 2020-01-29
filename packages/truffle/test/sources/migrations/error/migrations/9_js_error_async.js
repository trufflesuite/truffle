const Example = artifacts.require("Example");

module.exports = async function(deployer, network, accounts) {
  await deployer.deploy(Hello);
};