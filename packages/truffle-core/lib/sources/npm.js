var path = require("path");
var fs = require("fs");

function NPM(config) {
  this.config = config;
};

NPM.prototype.find = function(import_path, callback) {
  var expected_path = path.join(this.config.working_directory, "node_modules", import_path);

  fs.readFile(expected_path, {encoding: "utf8"}, function(err, body) {
    // If there's an error, that means we can't read the source even if
    // it exists. Treat it as if it doesn't by ignoring any errors.
    // Perhaps we can do something better here in the future.
    return callback(null, body);
  })
};

// We're resolving package paths to other package paths, not absolute paths.
// This will ensure the source fetcher conintues to use the correct sources for packages.
// i.e., if some_module/contracts/MyContract.sol imported "./AnotherContract.sol",
// we're going to resolve it to some_module/contracts/AnotherContract.sol, ensuring
// that when this path is evaluated this source is used again.
NPM.prototype.resolve_dependency_path = function(import_path, dependency_path) {
  var dirname = path.dirname(import_path);
  return path.join(dirname, dependency_path);
};

module.exports = NPM;
