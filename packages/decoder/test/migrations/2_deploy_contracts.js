const DecoyLibrary = artifacts.require("DecoyLibrary");
const DowngradeTest = artifacts.require("DowngradeTest");
const DecodingSample = artifacts.require("DecodingSample");
const WireTest = artifacts.require("WireTest");
const WireTestLibrary = artifacts.require("WireTestLibrary");
const ShadowDerived = artifacts.require("ShadowDerived");

module.exports = function(deployer) {
  deployer.deploy(DecoyLibrary);
  deployer.link(DecoyLibrary, DowngradeTest);
  deployer.deploy(DecodingSample);
  deployer.deploy(WireTestLibrary);
  deployer.link(WireTestLibrary, WireTest);
  deployer.deploy(WireTest, false, "0x", 0);
  deployer.deploy(ShadowDerived);
};
