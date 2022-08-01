const fs = require("fs");
const path = require("path");

const chalk = require("chalk");

const { Range } = require("semver");

const debug = require("debug")("check-package-versions");

function main() {
  const packages = readPackages();
  const errors = [];
  const warnings = [];

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
      try {
        checkDependencyVersionRange(
          packages[candidateName],
          packages[dependencyName]
        );
      } catch (err) {
        warnings.push(err.message);
      }
    }
  }

  for (const error of errors) {
    console.error(chalk.red("Error:"), error);
  }
  for (const warning of warnings) {
    console.error(chalk.yellow("Warning:"), warning);
  }

  const doneColor =
    errors.length > 0
      ? chalk.red
      : warnings.length > 0
      ? chalk.yellow
      : chalk.green;
  console.error(
    doneColor("Done."),
    `${errors.length} errors, ${warnings.length} warnings found for @truffle namespace version dependencies.`
  );

  if (errors.length > 0) {
    process.exit(1);
  }
}

function getPackageNames() {
  return fs.readdirSync(path.join(__dirname, "..", "packages"));
}

function readPackages() {
  const packages = getPackageNames();
  const packageSpecs = {};
  for (const packageName of packages) {
    const packageFilePath = path.join(
      path.resolve(__dirname, "..", "packages", packageName),
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

function checkDependencyVersionRange(candidate, dependency) {
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

      if (rawRange !== `^${version}`) {
        throw new Error(
          `Package "${candidate.name}" depends on "${name}@${rawRange}", but range has not been updated for version ${version}`
        );
      } else {
        debug(
          `${candidate.name} requires ${name}@${version} (${rawRange} is up-to-date for version ${version})`
        );
      }
    } else {
      debug(`${candidate.name} does not require ${name}`);
    }
  }
}

if (require.main === module) {
  main();
}
