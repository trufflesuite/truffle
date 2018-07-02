const Example = artifacts.require("Example");
const ExampleRevert = artifacts.require("ExampleRevert");
const UsesExample = artifacts.require("UsesExample");

module.exports = async function(deployer, network, accounts) {
  await deployer.deploy(Example);
  await deployer.deploy(ExampleRevert);
  await deployer.deploy(UsesExample, Example.address);
};
