import fse from "fs-extra";
import path from "path";
import download from "download-git-repo";
import axios from "axios";
import vcsurl from "vcsurl";
import { parse as parseURL } from "url";
import { spawn } from "child_process";
import inquirer from "inquirer";
import type { Question } from "inquirer";
import type { boxConfig, unboxOptions } from "typings";
import { promisify } from "util";
import ignore from "ignore";

function verifyLocalPath(localPath: string) {
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
    await axios.head(repoUrl, { maxRedirects: 50 });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new Error(
        `Truffle Box at URL ${url} doesn't exist. If you believe this is an error, please contact Truffle support.`
      );
    } else {
      const prefix = `Error connecting to ${repoUrl}. Please check your internet connection and try again.`;
      error.message = `${prefix}\n\n${error.message || ""}`;
      throw error;
    }
  }
}

async function verifySourcePath(sourcePath: string) {
  if (sourcePath.startsWith("/")) {
    return verifyLocalPath(sourcePath);
  }
  return verifyVCSURL(sourcePath);
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

async function fetchRepository(sourcePath: string, dir: string) {
  if (sourcePath.startsWith("/")) {
    const filter = await gitIgnoreFilter(sourcePath);
    return fse.copy(sourcePath, dir, {
      filter: file =>
        sourcePath === file || !filter.ignores(path.relative(sourcePath, file))
    });
  }
  return promisify(download)(sourcePath, dir);
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
    const overwriting: Question[] = [
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

/** tokenize uh tokenizes a string into substrings splitting on spaces
 * while preserving quoted substrings.
 */
function tokenize(input: string): string[] {
  const tokens = [];

  // track start of current token
  let currTokenStart = 0;
  let [i, L] = [0, input.length];
  while (i < L) {
    let ch = input[i];

    // beginning of a quote
    if (`'"`.includes(ch)) {
      // token start should be after quote
      currTokenStart = i + 1;

      // remember quote to match its end pair
      const m = ch;

      // consume characters (inc index) until matching end quote
      while ((ch = input[++i]) !== m);

      // extract the current token
      tokens.push(input.slice(currTokenStart, i));

      // update the start of the next token, and inc index
      currTokenStart = ++i;
    } else if (ch === " ") {
      // a space outside of a quote

      // consume all spaces, inc index
      while ((ch = input[++i]) === " ");

      // extract token
      const token = input.slice(currTokenStart, i - 1).trim();

      // store if it's an actual token; spaces don't count
      if (token.length) tokens.push(token);

      // update start of the next token
      currTokenStart = i;
    } else {
      // neither quote nor space. increment index
      i++;

      // if at the end of the input, save last token
      if (i >= L) tokens.push(input.slice(currTokenStart, i));
    }
  }
  return tokens;
}

async function installBoxDependencies(
  { hooks }: boxConfig,
  destination: string
) {
  const postUnpack = hooks["post-unpack"];

  if (postUnpack.length === 0) return;
  const [cmd, ...args] = tokenize(postUnpack);
  const spawned = spawn(cmd, args, { cwd: destination, stdio: "pipe" });
  spawned.stdout.on("data", d => console.log(d.toString()));
  spawned.stderr.on("data", d => console.log(d.toString()));
  return new Promise((resolve, reject) => {
    spawned.on("close", (code: number) => {
      if (!code) {
        return resolve(code);
      }
      reject(code);
    });
  });
}

export = {
  copyTempIntoDestination,
  fetchRepository,
  installBoxDependencies,
  prepareToCopyFiles,
  verifySourcePath,
  verifyVCSURL
};
