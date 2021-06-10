var Migrations = artifacts.require("./Migrations.sol");

module.exports = function(deployer) {
  Promise.reject(4242);
  deployer.deploy(Migrations);
};
