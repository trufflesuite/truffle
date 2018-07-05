var ExtraLibraryX = artifacts.require("@org/pkg/ExtraLibraryX");
var ExtraLibrary2 = artifacts.require("ExtraLibrary2");

module.exports = function(deployer) {
  deployer.link(ExtraLibraryX, ExtraLibrary2);
  deployer.deploy(ExtraLibrary2);
};
