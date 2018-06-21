#!/usr/bin/env node

/**
 * This script checks out the specified branch and runs:
 *    `npm version <version-tag>`
 * where <version-tag> is a pre-release increment with the tag id.
 * **********************************************************************
 * NB: It updates the package version and makes a commit.
 * **********************************************************************
 * USAGE:
 *   node ./version.js <branch> <tag>
 */
const fs = require('fs');
const path = require('path');
const exec = require('child_process').execSync
const semver = require('semver');

const args = process.argv.slice(2);

// Example command node ./version.js byoc-safe byoc
const branch = args[0];
const tag = args[1];
const step = 'prerelease';

// Checkout branch
exec(`git checkout ${branch}`, {stdio:[0,1,2]});
console.log();

// Read package
console.log('Loading package');
let pkg = fs.readFileSync('./package.json');
pkg = JSON.parse(pkg);

// Get semver increment string
const version = semver.inc(pkg.version, step, tag);

// npm version: this updates the package and commits
console.log(`Running: npm version ${version}`)
exec(`npm version ${version}`);