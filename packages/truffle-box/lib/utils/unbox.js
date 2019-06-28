const fse = require("fs-extra");
const path = require("path");
const ghdownload = require("github-download");
const rp = require("request-promise-native");
const vcsurl = require("vcsurl");
const { parse: parseURL } = require("url");
const { execSync } = require("child_process");
const inquirer = require("inquirer");

async function verifyURL(url) {
  // Next let's see if the expected repository exists. If it doesn't, ghdownload
  // will fail spectacularly in a way we can't catch, so we have to do it ourselves.
  const configURL = parseURL(
    `${vcsurl(url)
      .replace("github.com", "raw.githubusercontent.com")
      .replace(/#.*/, "")}/master/truffle-box.json`
  );

  const options = {
    method: "HEAD",
    uri: `https://${configURL.host}${configURL.path}`,
    resolveWithFullResponse: true,
    simple: false
  };

  const { statusCode } = await rp(options);
  if (statusCode === 404) {
    throw new Error(
      `Truffle Box at URL ${url} doesn't exist. If you believe this is an error, please contact Truffle support.`
    );
  } else if (statusCode !== 200) {
    throw new Error(
      "Error connecting to github.com. Please check your internet connection and try again."
    );
  }
}

function fetchRepository(url, dir) {
  return new Promise((accept, reject) => {
    // Download the package from github.
    ghdownload(url, dir)
      .on("err", err => {
        reject(err);
      })
      .on("end", () => {
        accept();
      });
  });
}

function prepareToCopyFiles(tempDir, { ignore }) {
  const needingRemoval = ignore;

  // remove box config file
  needingRemoval.push("truffle-box.json");
  needingRemoval.push("truffle-init.json");

  needingRemoval
    .map(fileName => path.join(tempDir, fileName))
    .forEach(filePath => fse.removeSync(filePath));
}

async function promptOverwrites(contentCollisions, logger = console) {
  const overwriteContents = [];

  for (const file of contentCollisions) {
    logger.log(`${file} already exists in this directory...`);
    const overwriting = [
      {
        type: "confirm",
        name: "overwrite",
        message: `Overwrite ${file}?`,
        default: false
      }
    ];

    const { overwrite } = await inquirer.prompt(overwriting);
    if (overwrite) {
      fse.removeSync(file);
      overwriteContents.push(file);
    }
  }

  return overwriteContents;
}

async function copyTempIntoDestination(tmpDir, destination, options) {
  fse.ensureDirSync(destination);
  const { force, logger } = options;
  const boxContents = fse.readdirSync(tmpDir);
  const destinationContents = fse.readdirSync(destination);

  const newContents = boxContents.filter(
    filename => !destinationContents.includes(filename)
  );

  const contentCollisions = boxContents.filter(filename =>
    destinationContents.includes(filename)
  );

  let shouldCopy;
  if (force) {
    shouldCopy = boxContents;
  } else {
    const overwriteContents = await promptOverwrites(contentCollisions, logger);
    shouldCopy = [...newContents, ...overwriteContents];
  }

  for (const file of shouldCopy) {
    fse.copySync(`${tmpDir}/${file}`, `${destination}/${file}`);
  }
}

function installBoxDependencies({ hooks }, destination) {
  const postUnpack = hooks["post-unpack"];

  if (postUnpack.length === 0) return;
  execSync(postUnpack, { cwd: destination });
}

module.exports = {
  copyTempIntoDestination,
  fetchRepository,
  installBoxDependencies,
  prepareToCopyFiles,
  verifyURL
};
