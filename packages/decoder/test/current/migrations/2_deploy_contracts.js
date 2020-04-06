const DecoyLibrary = artifacts.require("DecoyLibrary");
const DowngradeTest = artifacts.require("DowngradeTest");
const WireTest = artifacts.require("WireTest");
const WireTestLibrary = artifacts.require("WireTestLibrary");
const ReceiveTest = artifacts.require("ReceiveTest");
const FallbackTest = artifacts.require("FallbackTest");
const DecodingSample = artifacts.require("DecodingSample");

module.exports = function(deployer) {
  deployer.deploy(DecoyLibrary);
  deployer.link(DecoyLibrary, DowngradeTest);
  deployer.deploy(WireTestLibrary);
  deployer.link(WireTestLibrary, WireTest);
  deployer.deploy(WireTest, false, "0x", 0);
  deployer.deploy(ReceiveTest);
  deployer.deploy(FallbackTest);
  deployer.deploy(DecodingSample);
};
