const DecoyLibrary = artifacts.require("DecoyLibrary");
const DowngradeTest = artifacts.require("DowngradeTest");
const WireTest = artifacts.require("WireTest");
const WireTestLibrary = artifacts.require("WireTestLibrary");

module.exports = function(deployer) {
  deployer.deploy(DecoyLibrary);
  deployer.link(DecoyLibrary, DowngradeTest);
  deployer.deploy(WireTestLibrary);
  deployer.link(WireTestLibrary, WireTest);
  deployer.deploy(WireTest, false, "0x", 0);
};
