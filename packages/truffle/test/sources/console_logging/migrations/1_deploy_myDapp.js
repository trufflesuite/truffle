const MyDapp = artifacts.require("./MyDapp.sol");

module.exports = function(deployer) {
  deployer.deploy(MyDapp);
};
