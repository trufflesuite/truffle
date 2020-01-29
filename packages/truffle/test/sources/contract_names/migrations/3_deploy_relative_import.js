// This migration uses `artifacts.require()` in a way that:
// 1) Doesn't include a file extension
// 2) Refers to the contract name rather than the file name.
var RelativeImport = artifacts.require("RelativeImport");

module.exports = function(deployer) {
  deployer.deploy(RelativeImport);
};
