const Migrations = artifacts.require("Migrations");
const MetaCoin = artifacts.require("TokenDemo");

// @ts-ignore
module.exports = function(deployer, _network, _accounts) {
  // Use the accounts within your migrations.
  // console.log(deployer)
  deployer.deploy(Migrations);
  deployer.deploy(MetaCoin, 1000000, "abc", 10, "ABC");
};
