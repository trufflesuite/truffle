const fs = require("fs");
const path = require("path");

const { Range } = require("semver");

const debug = require("debug")("check-package-versions");

function getPackageNames() {
  if (!process.env["TRUFFLE_ROOT"]) {
    throw new Error(
      "Must define TRUFFLE_ROOT environment variable with a value set to the path of the root of your local truffle repository"
    );
  }
  return fs.readdirSync(path.join(process.env["TRUFFLE_ROOT"], "packages"));
}

function readPackages() {
  if (!process.env["TRUFFLE_ROOT"]) {
    throw new Error(
      "Must define TRUFFLE_ROOT environment variable with a value set to the path of the root of your local truffle repository"
    );
  }
  const packages = getPackageNames();
  const packageSpecs = {};
  for (const packageName of packages) {
    const packageFilePath = path.join(
      process.env["TRUFFLE_ROOT"],
      "packages",
      packageName,
      "package.json"
    );
    const rawJson = fs.readFileSync(packageFilePath, { encoding: "utf8" });
    packageSpecs[packageName] = JSON.parse(rawJson);
  }

  return packageSpecs;
}

function checkDependencyVersion(candidate, dependency) {
  const name = dependency.name;
  const version = dependency.version;

  for (const depType of [
    "dependencies",
    "devDependencies",
    "peerDependencies"
  ]) {
    const deps = candidate[depType];
    if (deps && deps[name]) {
      const rawRange = deps[name];
      const range = new Range(rawRange);
      if (!range.test(version)) {
        throw new Error(
          `Package "${candidate.name}" depends on "${name}@${rawRange}", but local "${name}" has version ${version}, which is not in range ${rawRange}`
        );
      } else {
        debug(
          `${candidate.name} requires ${name}@${version} (${version} in range ${deps[name]})`
        );
      }
    } else {
      debug(`${candidate.name} does not require ${name}`);
    }
  }
}

function main() {
  const packages = readPackages();
  const errors = [];

  for (const candidateName in packages) {
    for (const dependencyName in packages) {
      try {
        checkDependencyVersion(
          packages[candidateName],
          packages[dependencyName]
        );
      } catch (err) {
        errors.push(err.message);
      }
    }
  }

  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exit(1);
  }

  console.log("No errors found");
}

if (require.main === module) {
  main();
}
