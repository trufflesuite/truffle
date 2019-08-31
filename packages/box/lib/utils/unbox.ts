import fse from "fs-extra";
import path from "path";
import ghdownload from "github-download";
import rp from "request-promise-native";
import vcsurl from "vcsurl";
import { parse as parseURL } from "url";
import { execSync } from "child_process";
import inquirer from "inquirer";
import { boxConfig, unboxOptions } from "typings";

async function verifyURL(url: string) {
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

function fetchRepository(url: string, dir: string) {
  return new Promise((accept, reject) =>
    // Download the package from github.
    ghdownload(url, dir)
      .on("err", reject)
      .on("end", accept)
  );
}

function prepareToCopyFiles(tempDir: string, { ignore }: boxConfig) {
  const needingRemoval = ignore;

  // remove box config file
  needingRemoval.push("truffle-box.json");
  needingRemoval.push("truffle-init.json");

  needingRemoval
    .map((fileName: string) => path.join(tempDir, fileName))
    .forEach((filePath: string) => fse.removeSync(filePath));
}

async function promptOverwrites(
  contentCollisions: Array<string>,
  logger = console
) {
  const overwriteContents = [];

  for (const file of contentCollisions) {
    logger.log(`${file} already exists in this directory...`);
    const overwriting: inquirer.Questions = [
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

async function copyTempIntoDestination(
  tmpDir: string,
  destination: string,
  options: unboxOptions
) {
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

function installBoxDependencies({ hooks }: boxConfig, destination: string) {
  const postUnpack = hooks["post-unpack"];

  if (postUnpack.length === 0) return;
  execSync(postUnpack, { cwd: destination });
}

export = {
  copyTempIntoDestination,
  fetchRepository,
  installBoxDependencies,
  prepareToCopyFiles,
  verifyURL
};
