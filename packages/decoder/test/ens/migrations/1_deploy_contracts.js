const debug = require("debug")("decoder:test:ens:migrations");
const EnsTest = artifacts.require("EnsTest");

module.exports = async function (deployer, _, accounts) {
  const name = "myexample.eth";
  debug("setting forward");
  await deployer.ens.setAddress(name, accounts[0], { from: accounts[0] });
  const registryAddress = deployer.ens.devRegistry.address;
  debug("setting backward");
  await deployer.ens.ensjs.setReverseRecord(name); //sets it for accounts[0]
  debug("deploying");
  await deployer.deploy(EnsTest, registryAddress);
  debug("done");
};
