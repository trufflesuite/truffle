// This migration uses `artifacts.require()` in a way that:
// 1) Doesn't include a file extension
// 2) Refers to the contract name rather than the file name.
var Contract = artifacts.require("Contract");

module.exports = function(deployer) {
  deployer.deploy(Contract);
};
