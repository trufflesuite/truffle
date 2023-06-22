const DecodingSample = artifacts.require("DecodingSample");

module.exports = function (deployer) {
  deployer.deploy(DecodingSample);
};
