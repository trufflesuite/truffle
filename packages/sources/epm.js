const path = require("path");
const fs = require("fs");

function EPM(working_directory, contracts_build_directory) {
  this.working_directory = working_directory;
  this.contracts_build_directory = contracts_build_directory;
}

EPM.prototype.require = function(importPath, _searchPath) {
  if (importPath.indexOf(".") === 0 || importPath.indexOf("/") === 0) {
    return null;
  }

  // Look to see if we've compiled our own version first.
  const contractName = path.basename(importPath, ".sol");

  // We haven't compiled our own version. Assemble from data in the lockfile.
  const separator = importPath.indexOf("/");
  const packageName = importPath.substring(0, separator);

  const installDirectory = path.join(
    this.working_directory,
    "installed_contracts"
  );
  let lockfile = path.join(installDirectory, packageName, "lock.json");

  try {
    lockfile = fs.readFileSync(lockfile, "utf8");
  } catch (e) {
    return null;
  }

  lockfile = JSON.parse(lockfile);

  const json = {
    contract_name: contractName,
    networks: {}
  };

  // TODO: contracts that reference other types
  // TODO: contract types that specify a hash as their key
  // TODO: imported name doesn't match type but matches deployment name
  const contractTypes = lockfile.contract_types || {};
  const type = contractTypes[contractName];

  // No contract name of the type asked.
  if (!type) return null;

  json.abi = type.abi;
  json.unlinked_binary = type.bytecode;

  // Go through deployments and save all of them
  Object.keys(lockfile.deployments || {}).forEach(function(blockchain) {
    const deployments = lockfile.deployments[blockchain];

    Object.keys(deployments).forEach(function(name) {
      const deployment = deployments[name];
      if (deployment.contract_type === contractName) {
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

(EPM.prototype.resolve = function(importPath, _importedFrom) {
  const separator = importPath.indexOf("/");
  const packageName = importPath.substring(0, separator);
  const internalPath = importPath.substring(separator + 1);
  const installDir = this.working_directory;

  // If nothing's found, body returns `undefined`
  let body;

  while (true) {
    let filePath = path.join(installDir, "installed_contracts", importPath);

    try {
      body = fs.readFileSync(filePath, { encoding: "utf8" });
      break;
    } catch (err) {}

    filePath = path.join(
      installDir,
      "installed_contracts",
      packageName,
      "contracts",
      internalPath
    );

    try {
      body = fs.readFileSync(filePath, { encoding: "utf8" });
      break;
    } catch (err) {}

    // Recurse outwards until impossible
    const oldInstallDir = installDir;
    installDir = path.join(installDir, "..");
    if (installDir === oldInstallDir) break;
  }

  return {
    body,
    filePath: importPath
  }
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
