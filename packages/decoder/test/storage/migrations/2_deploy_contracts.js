const DecodingSample = artifacts.require("DecodingSample");
const ShadowDerived = artifacts.require("ShadowDerived");

module.exports = function(deployer) {
  deployer.deploy(DecodingSample);
  deployer.deploy(ShadowDerived);
};
