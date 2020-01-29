#!/usr/bin/env node

/**
 * This script checks out the specified branch, tags and publishes truffle at
 * <version-tag> where <version-tag> is a pre-release increment with the tag id.
 * It asks you if you're sure you want to do this. It also commits the version
 * update and pushes to the branch. If you exit, it leaves everything alone.
 * *****************************************************************************
 * NB: It updates the package version, publishes, makes a commit and pushes.
 * *****************************************************************************
 * USAGE:
 *   node ./scripts/prereleaseVersion.js <branch> <tag>
 *
 * ALSO:
 *   yarn publish:byoc
 *   yarn publish:next
 */
const fs = require("fs");
const exec = require("child_process").execSync;
const semver = require("semver");
const readline = require("readline");

const args = process.argv.slice(2);
const branch = args[0];
const tag = args[1];
const premajor = "premajor";
const prerelease = "prerelease";
const opts = { stdio: [0, 1, 2] };

// Validate args
if (!branch || !tag) {
  const help =
    `** You forgot to pass in some arguments **\n\n` +
    `USAGE:\n` +
    `   node ./scripts/prereleaseVersion.js <branch> <tag>\n\n` +
    `Ex: node ./scripts/prereleaseVersion.js next next\n` +
    `>>  truffle@4.1.12-next.0  truffle@next\n`;

  console.log(help);
  process.exit(1);
}

// Checkout branch
exec(`git checkout ${branch}`, opts);
console.log();

// Read package
let pkg = fs.readFileSync("./package.json");
pkg = JSON.parse(pkg);

// Get semver increment string
let version;

!pkg.version.includes(tag)
  ? (version = semver.inc(pkg.version, premajor))
  : (version = pkg.version);

version = semver.inc(version, prerelease, tag);

// Describe actions:
const warn =
  `You are about to:\n` +
  `  + increment the package version to ${version}\n` +
  `  + publish the package on npm at tag: '${tag}'\n` +
  `  + commit and push this change to branch: '${branch}'\n\n` +
  `  ------------------------------------------\n` +
  "  Version".padEnd(25) +
  "| Tag\n" +
  `  ------------------------------------------\n` +
  `  truffle@${version}`.padEnd(25) +
  `| truffle@${tag}\n\n`;

const quest = `Are you sure you want to publish: (y/n) >> `;

const input = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Confirm
input.question(warn + quest, answer => {
  const reminder =
    `\n` +
    `** Remember: don't overwrite this version in the 'package.json' when you merge develop in. **\n`;

  const affirmations = [
    "y",
    "yes",
    "YES",
    "Yes",
    "OK",
    "Ok",
    "ok",
    "peace",
    "almost"
  ];

  const exit = `Exiting without publishing.`;

  // npm version updates the package and commits
  if (affirmations.includes(answer.trim())) {
    exec(`npm version ${version}`, opts);
    exec(`npm publish --tag ${tag}`, opts);

    // NPM version sometimes executes the commit, sometimes not.
    // This might be related to having yarn as the npm client?
    // If there's nothing to commit, that's fine
    // and this is just a noop that errors exec.
    try {
      exec(`git commit -a -m 'Upgrade version to ${version}'`, opts);
    } catch (err) {
      // ignore
    }

    exec(`git push`, opts);
    console.log(reminder);
    input.close();
    return;
  }

  // Exit doing nothing.
  console.log(exit);
  input.close();
});
