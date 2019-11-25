const path = require("path");
const fs = require("fs");
const detectInstalled = require("detect-installed");
const getInstalledPath = require("get-installed-path");

function GlobalNPM() {}

GlobalNPM.prototype.require = function(import_path) {
  if (import_path.indexOf(".") === 0 || path.isAbsolute(import_path)) {
    return null;
  }
  const contract_name = path.basename(import_path, ".sol");

  let [package_name] = import_path.split("/", 1);
  if (detectInstalled.sync(package_name)) {
    const regex = new RegExp(`/${package_name}$`);
    const global_package_path = getInstalledPath
      .getInstalledPathSync(package_name)
      .replace(regex, "");
    const expected_path = path.join(
      global_package_path,
      package_name,
      "build",
      "contracts",
      contract_name + ".json"
    );
    try {
      const result = fs.readFileSync(expected_path, "utf8");
      return JSON.parse(result);
    } catch (e) {
      return null;
    }
  }
};

GlobalNPM.prototype.resolve = function(importPath, _importedFrom) {
  let [packageName] = importPath.split("/", 1);
  let body;
  if (detectInstalled.sync(packageName)) {
    const regex = new RegExp(`/${packageName}$`);
    const globalPackagePath = getInstalledPath
      .getInstalledPathSync(packageName)
      .replace(regex, "");
    const expectedPath = path.join(globalPackagePath, importPath);
    try {
      body = fs.readFileSync(expectedPath, { encoding: "utf8" });
    } catch (err) {}
  }

  // If nothing's found, body returns `undefined`
  return {
    body,
    filePath: importPath
  }
};

// We're resolving package paths to other package paths, not absolute paths.
// This will ensure the source fetcher conintues to use the correct sources for packages.
// i.e., if some_module/contracts/MyContract.sol imported "./AnotherContract.sol",
// we're going to resolve it to some_module/contracts/AnotherContract.sol, ensuring
// that when this path is evaluated this source is used again.
GlobalNPM.prototype.resolve_dependency_path = function(
  import_path,
  dependency_path
) {
  var dirname = path.dirname(import_path);
  return path.join(dirname, dependency_path);
};

GlobalNPM.prototype.provision_contracts = function(callback) {
  // TODO: Fill this out!
  callback(null, {});
};

module.exports = GlobalNPM;
