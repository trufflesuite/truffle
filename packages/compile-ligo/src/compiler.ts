import { spawn } from "child_process";
import colors from "colors";
import { readFileSync } from "fs";
import path from "path";

const util = require("util");
const exec = util.promisify(require("child_process").exec);

import debugModule from "debug";
const debug = debugModule("compile-ligo");

const compiler = {
  name: "ligo",
  version: "next"
};

const compileLigo = async (paths: string[], entryPoint: string = "main") => {
  // TODO BGC Decide how to handle error
  await exec("docker run --rm -i ligolang/ligo:next --help");

  let contracts: Array<any> = [];

  for (const sourcePath of paths) {
    let compiledContract;
    try {
      compiledContract = await compileLigoFile(sourcePath, entryPoint);
    } catch (error) {
      throw error;
    }
    // remove extension from filename
    const extension = path.extname(sourcePath as string);
    const basename = path.basename(sourcePath as string, extension);

    const contractName = basename;

    const sourceBuffer = readFileSync(sourcePath as string);
    const sourceContents = sourceBuffer.toString();

    const contractDefinition = {
      contractName,
      sourcePath,
      source: sourceContents,
      michelson: compiledContract,
      compiler
    };

    contracts.push(contractDefinition);
  }
  const result = contracts.reduce((result: any, contract: any) => {
    result[contract.contractName] = contract;

    return result;
  }, {});

  return { result, paths, compiler };
};

// Compile single LIGO file
const compileLigoFile = (sourcePath: any, entryPoint: string) => {
  return new Promise((resolve, reject) => {
    // Note that the first volume parameter passed to docker needs to have a path
    // denoted in the format of of the host filesystem. The latter volume parameter,
    // as well as the entry point, needs to be denoted in the format of the VM.
    // Because of this, we rewrite the VM paths relative to a mounted volume called "project".

    // In order to make this work on all platforms, we first normalize every host path
    // (working directory, and source path). We then construct a VM internal sourch path,
    // using normalized working directory and source path. From there, we know this constructed
    // internal source path won't contain any "gotcha's", such as double-escaped path separators,
    // etc. From there, we replace all backslashes with forward slashes, which is the path
    // separator expected within the internal source.
    let currentWorkingDirectory = path.normalize(process.cwd());
    sourcePath = path.normalize(sourcePath);

    let fullInternalSourcePath = path
      .normalize("/project" + sourcePath.replace(currentWorkingDirectory, ""))
      .replace(/\\/g, "/");

    // Use spawn() instead of exec() here so that the OS can take care of escaping args.
    let docker = spawn("docker", [
      "run",
      "-v",
      currentWorkingDirectory + ":/project",
      "--rm",
      "-i",
      "ligolang/ligo:next",
      "compile-contract",
      "--michelson-format=json",
      fullInternalSourcePath,
      entryPoint
    ]);

    let stdout = "";
    let stderr = "";

    docker.stdout.on("data", data => {
      stdout += data;
    });

    docker.stderr.on("data", data => {
      stderr += data;
    });

    docker.on("close", code => {
      if (code != 0 || stderr != "") {
        reject(
          `${stderr}\n${colors.red(
            `Compilation of ${sourcePath} failed. See above.`
          )}`
        );
      }

      const jsonContractOutput = stdout.trim();

      resolve(jsonContractOutput);
    });
  });
};

export { compileLigo };