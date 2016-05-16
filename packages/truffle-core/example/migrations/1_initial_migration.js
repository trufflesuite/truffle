module.exports = function(deployer) {
  deployer.deploy(ConvertLib);
  deployer.autolink(MetaCoin);
  deployer.deploy(MetaCoin);
};
