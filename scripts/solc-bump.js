const fs = require("fs");
const { execSync } = require("child_process");
const readline = require("readline");
const path = require("path");

const PACKAGES_DIR = path.resolve(__dirname, "..", "packages");

/**
 * Update packages that depend on solc to the latest version
 *
 * @param dryRun {Boolean} Do a dry run and only return the packages that would be updated
 * @returns packageNames {String[]} Returns the packages names that depend on solc
 **/
function updatePackages(dryRun = false) {
  const packages = fs.readdirSync(PACKAGES_DIR);
  return packages
    .map(packageName => {
      // parse the package.json file for `packageName`
      const packagePath = path.resolve(PACKAGES_DIR, packageName);
      const packageJsonPath = path.resolve(packagePath, "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

      // operate if the solc dependency exists
      if (packageJson.dependencies && packageJson.dependencies["solc"]) {
        if (dryRun) return packageName;
        return updatePackage(packageName, packagePath, false);
      } else if (
        packageJson.devDependencies &&
        packageJson.devDependencies["solc"]
      ) {
        if (dryRun) return packageName;
        return updatePackage(packageName, packagePath, true);
      }
    })
    .filter(arg => !!arg);
}

/**
 * Update an individual subpackage
 *
 * @param packageName {String} The string package name
 * @param packagePath {String} The full package directory path
 * @param dev {Boolean} True if solc is a dev dependency
 * @returns packageName {String} Returns the package name
 **/
function updatePackage(packageName, packagePath, dev) {
  console.log(`Updating ${packageName}${dev ? " dev " : " "}dependency`);
  execSync(`npm install solc@latest ${dev ? "--save-dev" : "--save"}`, {
    cwd: packagePath
  });
  return packageName;
}

// Get the packages that have a solc dependency
const solcPackageDeps = updatePackages(true);

console.log("Bumping solidity version for the following packages:");
console.log(solcPackageDeps);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("\nContinue: (Y/n)\n", answer => {
  if (answer !== "" && answer !== "Y" && answer !== "y") {
    console.log("Cancelled");
    process.exit(0);
  }
  rl.close();
  updatePackages();
  console.log(`Updated ${solcPackageDeps.length} packages to solc@latest`);
  process.exit(0);
});
