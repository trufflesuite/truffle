const IsLibrary = artifacts.require("IsLibrary");
const UsesExample = artifacts.require("UsesExample");
const UsesLibrary = artifacts.require("UsesLibrary");

module.exports = async function(deployer) {
  await deployer.deploy(IsLibrary);
  await deployer.link(IsLibrary, UsesLibrary);
  await deployer.deploy(UsesExample, IsLibrary.address);
  await deployer.deploy(UsesLibrary);
};
