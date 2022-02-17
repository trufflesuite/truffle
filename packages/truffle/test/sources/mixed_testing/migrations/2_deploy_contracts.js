const StrangeEventTest = artifacts.require("StrangeEventTest");

module.exports = async function (deployer) {
  await deployer.deploy(StrangeEventTest);
};
