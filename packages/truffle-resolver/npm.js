var path = require("path");
var fs = require("fs");

function NPM(working_directory) {
  this.working_directory = working_directory;
};

NPM.prototype.require = function(import_path, search_path) {
  if (import_path.indexOf(".") == 0 || import_path.indexOf("/") == 0) {
    return null;
  }

  var separator = import_path.indexOf("/")
  var package_name = import_path.substring(0, separator);
  var contract_name = path.basename(import_path, ".sol");

  var expected_path = path.join((search_path || this.working_directory), "node_modules", package_name, "build", "contracts", contract_name + ".json");

  try {
    var result = fs.readFileSync(expected_path, "utf8");
    return JSON.parse(result);
  } catch (e) {
    return null;
  }
};

NPM.prototype.resolve = function(import_path, imported_from, callback) {
  var expected_path = path.join(this.working_directory, "node_modules", import_path);

  fs.readFile(expected_path, {encoding: "utf8"}, function(err, body) {
    var resolved_path;
    if (body) {
      resolved_path = expected_path;
    }

    // If there's an error, that means we can't read the source even if
    // it exists. Treat it as if it doesn't by ignoring any errors.
    // Perhaps we can do something better here in the future.

    // Note: resolved_path is the import path because these imports are special.
    return callback(null, body, import_path);
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

NPM.prototype.provision_contracts = function(callback) {
  // TODO: Fill this out!
  callback(null, {});
};


module.exports = NPM;
