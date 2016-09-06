var Deployed = require("./deployed");
var path = require("path");
var fs = require("fs");

function TestSource(project_files, project_contracts) {
  this.project_files = project_files;
  this.project_contracts = project_contracts || [];
};

TestSource.prototype.find = function(import_path, callback) {
  if (import_path == "truffle/DeployedAddresses.sol") {
    var addressSource = Deployed.makeSolidityDeployedAddressesLibrary(this.project_files, this.project_contracts);
    return callback(null, addressSource);
  }

  if (import_path == "truffle/Assert.sol") {
    return fs.readFile(path.resolve(path.join(__dirname, "Assert.sol")), {encoding: "utf8"}, callback);
  }

  return callback();
};

TestSource.prototype.resolve_dependency_path = function(importh_path, dependency_path) {
  return dependency_path;
}

module.exports = TestSource;
