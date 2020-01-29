var ConvertLib = artifacts.require("ConvertLib");
var MetaCoin = artifacts.require("MetaCoin");
var ExtraMetaCoin = artifacts.require("ExtraMetaCoin");

module.exports = function(deployer) {
  deployer.deploy(ConvertLib);
  deployer.link(ConvertLib, MetaCoin);
  deployer.link(ConvertLib, ExtraMetaCoin);
  deployer.deploy(MetaCoin);
  deployer.deploy(ExtraMetaCoin);
};
