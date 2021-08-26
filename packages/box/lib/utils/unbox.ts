import fse from "fs-extra";
import path from "path";
import download from "download-git-repo";
import axios from "axios";
import vcsurl from "vcsurl";
import { parse as parseURL } from "url";
import { execSync } from "child_process";
import inquirer from "inquirer";
import type { boxConfig, unboxOptions } from "typings";
import { promisify } from "util";
import ignore from "ignore";

function startsWithDrive(fn: string): Boolean {
  return /^[a-z]:/i.test(fn);
} 

function isLikelyFullFilePath(sourcePath: string): Boolean {
  // "\\" and /[a-z]:/i are valid root component for Windows paths
  // https://docs.microsoft.com/en-us/windows/win32/fileio/naming-a-file#fully-qualified-vs-relative-paths
  return startsWithDrive(sourcePath) || "/\\".includes(sourcePath[0]); 
}

function verifyBoxExistsAtPath(localPath: string) {
  const configPath = path.join(localPath, "truffle-box.json");
  fse.access(configPath).catch(_e => {
    throw new Error(`Truffle Box at path ${localPath} doesn't exist.`);
  });
}

async function verifyVCSURL(url: string) {
  // Next let's see if the expected repository exists. If it doesn't, ghdownload
  // will fail spectacularly in a way we can't catch, so we have to do it ourselves.
  const configURL = parseURL(
    `${vcsurl(url)
      .replace("github.com", "raw.githubusercontent.com")
      .replace(/#.*/, "")}/master/truffle-box.json`
  );

  const repoUrl = `https://${configURL.host}${configURL.path}`;
  try {
    await axios.head(
      repoUrl,
      { maxRedirects: 50 }
    );
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new Error(
        `Truffle Box at URL ${url} doesn't exist. If you believe this is an error, please contact Truffle support.`
      );
    } else {
      const prefix = `Error connecting to ${repoUrl}. Please check your internet connection and try again.`;
      error.message = `${prefix}\n\n${error.message || ''}`;
      throw error;
    }
  }
}

async function verifySourcePath(normalizedSourcePath: string) {
  if (isLikelyFullFilePath(normalizedSourcePath)) {
    return verifyBoxExistsAtPath(normalizedSourcePath);
  }
  return verifyVCSURL(normalizedSourcePath);
}

async function gitIgnoreFilter(sourcePath: string) {
  const ignoreFilter = ignore();
  try {
    const gitIgnore = await fse.readFile(
      path.join(sourcePath, ".gitignore"),
      "utf8"
    );
    ignoreFilter.add(gitIgnore.split(/\r?\n/).map(p => p.replace(/\/$/, "")));
  } catch (err) {}

  return ignoreFilter;
}

async function fetchRepository(normalizedSourcePath: string, dir: string) {
  if (isLikelyFullFilePath(normalizedSourcePath)) {
    const filter = await gitIgnoreFilter(normalizedSourcePath);
    return fse.copy(normalizedSourcePath, dir, {
      filter: file =>
        normalizedSourcePath === file || !filter.ignores(path.relative(normalizedSourcePath, file))
    });
  }
  return promisify(download)(normalizedSourcePath, dir);
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
  startsWithDrive,
  verifySourcePath,
  verifyVCSURL
};
