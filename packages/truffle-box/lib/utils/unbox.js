const fse = require("fs-extra");
const path = require("path");
const ghdownload = require("github-download");
const request = require("request");
const vcsurl = require("vcsurl");
const parseURL = require("url").parse;
const execSync = require("child_process").execSync;
const inquirer = require("inquirer");

function verifyURL(url) {
  // Next let's see if the expected repository exists. If it doesn't, ghdownload
  // will fail spectacularly in a way we can't catch, so we have to do it ourselves.
  return new Promise((accept, reject) => {
    const configURL = parseURL(
      `${vcsurl(url)
        .replace("github.com", "raw.githubusercontent.com")
        .replace(/#.*/, "")}/master/truffle-box.json`
    );

    const options = {
      method: "HEAD",
      uri: `https://${configURL.host}${configURL.path}`
    };
    request(options, (error, { statusCode }) => {
      if (error) {
        return reject(
          new Error(
            `Error making request to ${options.uri}. Got error: ${
              error.message
            }. Please check the format of the requested resource.`
          )
        );
      } else if (statusCode === 404) {
        return reject(
          new Error(
            `Truffle Box at URL ${url} doesn't exist. If you believe this is an error, please contact Truffle support.`
          )
        );
      } else if (statusCode !== 200) {
        return reject(
          new Error(
            "Error connecting to github.com. Please check your internet connection and try again."
          )
        );
      }
      accept();
    });
  });
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

  const promises = needingRemoval
    .map(fileName => path.join(tempDir, fileName))
    .map(async filePath => {
      try {
        fse.removeSync(filePath);
      } catch (error) {
        throw error;
      }
    });

  return Promise.all(promises);
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

    await inquirer.prompt(overwriting).then(({ overwrite }) => {
      if (overwrite) {
        fse.removeSync(file);
        overwriteContents.push(file);
      }
    });
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

  if (postUnpack.length === 0) {
    return;
  }

  try {
    execSync(postUnpack, { cwd: destination });
  } catch (error) {
    throw error;
  }
}

module.exports = {
  copyTempIntoDestination,
  fetchRepository,
  installBoxDependencies,
  prepareToCopyFiles,
  verifyURL
};
