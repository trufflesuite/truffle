const ConvertLib = artifacts.require("ConvertLib");
const MetaCoin = artifacts.require("MetaCoin");
const WrappedMetaCoin = artifacts.require("WrappedMetaCoin");

module.exports = function(deployer) {
  deployer.deploy(ConvertLib);
  deployer.link(ConvertLib, MetaCoin);
  deployer.deploy(MetaCoin).then(() => {
    return deployer.deploy(WrappedMetaCoin, MetaCoin.address);
  });
};
