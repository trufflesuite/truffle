const fs = require('fs');
const { execSync } = require('child_process');
const readline = require('readline');

/**
 * Load packages depending on `solc`
 **/
function loadSolcDependentPackages() {
  const packages = fs.readdirSync(`${__dirname}/../packages`);
  return packages.filter(packageName => {
    // parse the package.json file for `packageName`
    const _package = JSON.parse(fs.readFileSync(`${__dirname}/../packages/${packageName}/package.json`, 'utf8'));

    // operate if the solc dependency exists
    return _package && _package.dependencies && !!_package.dependencies['solc'];
  });
}

/**
 * Use child_process to run `npm install` in `packageName` synchronously
 **/
function updatePackages(packageNames) {
  packageNames.forEach(packageName => {
    console.log(`Updating ${packageName}`);
    execSync('npm install solc@latest', {
      cwd: `${__dirname}/../packages/${packageName}`
    });
  });
}

// Get the packages that have a solc dependency
const solcPackageDeps = loadSolcDependentPackages();

console.log('Bumping solidity version for the following packages:');
console.log(solcPackageDeps);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('\nContinue: (Y/n)\n', answer => {
  if (answer !== '' && answer !== 'Y' && answer !== 'y') {
    console.log('Cancelled');
    process.exit(0);
  }
  rl.close();
  updatePackages(solcPackageDeps);
  console.log(`Updated ${solcPackageDeps.length} packages to solc@latest`);
  process.exit(0);
});
