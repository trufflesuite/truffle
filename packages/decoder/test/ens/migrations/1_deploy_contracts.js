const EnsTest = artifacts.require("EnsTest");

module.exports = async function (deployer, _, accounts) {
  const name = "myexample.eth";
  await deployer.ens.setAddress(name, accounts[0], { from: accounts[0] });
  const registryAddress = deployer.ens.devRegistry.address;
  await deployer.ens.ensjs.setReverseRecord(name); //sets it for accounts[0]
  await deployer.deploy(EnsTest, registryAddress);
};
