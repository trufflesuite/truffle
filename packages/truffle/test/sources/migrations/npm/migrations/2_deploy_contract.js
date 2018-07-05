var ExtraLibrary = artifacts.require("@org/pkg/ExtraLibrary");
var ExtraLibrary2 = artifacts.require("dep2/ExtraLibrary2");
var Contract3 = artifacts.require("Contract3");

module.exports = function(deployer) {
  deployer.link(ExtraLibrary, Contract3);
  deployer.link(ExtraLibrary2, Contract3);
  deployer.deploy(Contract3);
};
