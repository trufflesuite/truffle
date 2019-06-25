const DecodingSample = artifacts.require("DecodingSample.sol");
//we don't deploy WireTest because we're going to use WireTest.new for that

module.exports = function(deployer) {
  deployer.deploy(DecodingSample);
};
