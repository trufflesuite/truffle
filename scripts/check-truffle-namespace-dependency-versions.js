const fs = require("fs");
const path = require("path");

const chalk = require("chalk");

const debug = require("debug")("check-package-versions");

function main() {
  const packages = readPackages();
  const errors = [];

  for (const candidateName in packages) {
    for (const dependencyName in packages) {
      errors.push(
        ...checkDependencyVersionRange(
          packages[candidateName],
          packages[dependencyName]
        )
      );
    }
  }

  for (const error of errors) {
    console.error(chalk.red("Error:"), error);
  }
  const doneColor = errors.length > 0 ? chalk.red : chalk.green;
  console.error(
    doneColor("Done."),
    `Found ${errors.length} errors for @truffle namespace version dependencies.`
  );

  if (errors.length > 0) {
    process.exit(1);
  }
}

function getPackageDirectoryNames() {
  return fs.readdirSync(path.join(__dirname, "..", "packages"));
}

function readPackages() {
  const packages = getPackageDirectoryNames();
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

const depTypes = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
  "bundleDependencies", // may be bool. may be spelled "bundleDependencies"
  "bundledDependencies" // may be bool, may be spelled "bundleDependencies"
];

function* checkDependencyVersionRange(candidate, dependency) {
  const name = dependency.name;
  const version = dependency.version;

  for (const depType of depTypes) {
    const deps = candidate[depType];
    if (typeof deps === "object" && deps[name]) {
      const rawRange = deps[name];

      if (rawRange !== `^${version}`) {
        yield `Package "${candidate.name}" depends on "${name}@${rawRange}", but range has not been updated for version ${version}`;
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
