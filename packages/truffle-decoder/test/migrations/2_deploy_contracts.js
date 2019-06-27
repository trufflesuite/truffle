const DecodingSample = artifacts.require("DecodingSample");
const WireTest = artifacts.require("WireTest");
const WireTestLibrary = artifacts.require("WireTestLibrary");

module.exports = function(deployer) {
  deployer.deploy(DecodingSample);
  deployer.deploy(WireTestLibrary);
  deployer.link(WireTestLibrary, WireTest);
};
