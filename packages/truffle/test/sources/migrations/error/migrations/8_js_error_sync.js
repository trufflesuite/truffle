const Example = artifacts.require("Example");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(Hello);
};