const Loops = artifacts.require("Loops");

module.exports = async function (deployer) {
  // we set a gas limit to make it run out of gas
  await deployer.deploy(Loops, {
    gas: "0x146"
  });
};
