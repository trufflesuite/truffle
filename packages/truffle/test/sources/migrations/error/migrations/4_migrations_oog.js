const Loops = artifacts.require("Loops");

module.exports = async function(deployer, network, accounts) {
  await deployer.deploy(Loops);
};
