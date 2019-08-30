const DecodingSample = artifacts.require("./DecodingSample.sol");

module.exports = function(deployer) {
  deployer.deploy(DecodingSample);
};
