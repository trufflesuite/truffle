const ShadowDerived = artifacts.require("ShadowDerived");

module.exports = function(deployer) {
  deployer.deploy(ShadowDerived);
};
