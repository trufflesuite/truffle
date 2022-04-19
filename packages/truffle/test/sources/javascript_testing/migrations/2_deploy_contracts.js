const SimpleContract = artifacts.require("SimpleContract");

module.exports = async function (deployer) {
  await deployer.deploy(SimpleContract);
};
