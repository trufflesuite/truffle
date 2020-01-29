const Example = artifacts.require("Example");

module.exports = async function(deployer) {
  await deployer.deploy(Example);
  await deployer.deploy(Example);
};