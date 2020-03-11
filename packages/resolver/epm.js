var path = require("path");
var fs = require("fs");
var glob = require("glob");

function EPM(working_directory, contracts_build_directory) {
  this.working_directory = working_directory;
  this.contracts_build_directory = contracts_build_directory;
  this.allEthpmFiles = glob.sync("**/*", {
    cwd: path.join(this.working_directory, "_ethpm_packages")
  });
}

EPM.prototype.require = function(import_path, _search_path) {
  if (import_path.indexOf(".") === 0 || import_path.indexOf("/") === 0) {
    return null;
  }

  // Look to see if we've compiled our own version first.
  var contract_name = path.basename(import_path, ".sol");

  // We haven't compiled our own version. Assemble from data in the manifest.
  var separator = import_path.indexOf("/");
  var package_name = import_path.substring(0, separator);

  var install_directory = path.join(this.working_directory, "_ethpm_packages");
  var manifest = path.join(install_directory, package_name, "manifest.json");

  try {
    manifest = fs.readFileSync(manifest, "utf8");
  } catch (e) {
    return null;
  }

  manifest = JSON.parse(manifest);

  var json = {
    contract_name: contract_name,
    networks: {}
  };

  // TODO: contracts that reference other types
  // TODO: contract types that specify a hash as their key
  // TODO: imported name doesn't match type but matches deployment name
  var contract_types = manifest.contract_types || {};
  var type = contract_types[contract_name];

  // No contract name of the type asked.
  if (!type) return null;

  json.abi = type.abi;
  json.unlinked_binary = type.deployment_bytecode.bytecode;

  // Go through deployments and save all of them
  Object.keys(manifest.deployments || {}).forEach(function(blockchain) {
    var deployments = manifest.deployments[blockchain];

    Object.keys(deployments).forEach(function(name) {
      var deployment = deployments[name];
      if (deployment.contract_type === contract_name) {
        json.networks[blockchain] = {
          events: {},
          links: {},
          address: deployment.address
        };
      }
    });
  });
  return json;
};

(EPM.prototype.resolve = function(import_path, imported_from, callback) {
  var separator = import_path.indexOf("/");
  var package_name = import_path.substring(0, separator);
  var internal_path = import_path.substring(separator + 1);
  var installDir = this.working_directory;

  // If nothing's found, body returns `undefined`
  var body;
  var matches = this.allEthpmFiles.filter(p => p.includes(import_path));

  while (true) {
    // check for root level ethpm sources
    var file_path = path.join(
      installDir,
      "_ethpm_packages",
      package_name,
      "_src",
      internal_path
    );

    try {
      body = fs.readFileSync(file_path, { encoding: "utf8" });
      break;
    } catch (err) {}

    // DOES NOT SUPPORT DUPLICATE IMPORT PATHS W/IN AGGREGATED PKGS
    if (matches.length > 0) {
      if (matches.length === 1) {
        try {
          body = fs.readFileSync(
            path.join(installDir, "_ethpm_packages", matches[0]),
            { encoding: "utf8" }
          );
          break;
        } catch (err) {}
      }
    }

    // Recurse outwards until impossible
    var oldInstallDir = installDir;
    installDir = path.join(installDir, "..");
    if (installDir === oldInstallDir) {
      break;
    }
  }

  return callback(null, body, import_path);
}),
  // We're resolving package paths to other package paths, not absolute paths.
  // This will ensure the source fetcher conintues to use the correct sources for packages.
  // i.e., if some_module/contracts/MyContract.sol imported "./AnotherContract.sol",
  // we're going to resolve it to some_module/contracts/AnotherContract.sol, ensuring
  // that when this path is evaluated this source is used again.
  (EPM.prototype.resolve_dependency_path = function(
    import_path,
    dependency_path
  ) {
    var dirname = path.dirname(import_path);
    var resolved_dependency_path = path.join(dirname, dependency_path);

    // Note: We use `path.join()` here to take care of path idiosyncrasies
    // like joining "something/" and "./something_else.sol". However, this makes
    // paths OS dependent, and on Windows, makes the separator "\". Solidity
    // needs the separator to be a forward slash. Let's massage that here.
    resolved_dependency_path = resolved_dependency_path.replace(/\\/g, "/");

    return resolved_dependency_path;
  });

module.exports = EPM;
