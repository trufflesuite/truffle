import { spawn } from "child_process";
import colors from "colors";
import path from "path";
import util from "util";

const exec = util.promisify(require("child_process").exec);

import debugModule from "debug";
const debug = debugModule("compile-ligo");

const DEFAULT_SETTINGS = {
  entryPoint: "main",
  compiler: {
    dockerImage: "ligolang/ligo:next",
    details: {
      name: "ligo",
      version: "next"
    }
  }
};

type LigoCompileSettings = {
  entryPoint?: string,
  compiler?: {
    dockerImage: string,
    details: { name: string, version: string }
  }
};

type MichelsonOutput = {
  sourcePath: string,
  michelson: string
};

type LigoCompilerResult = {
  results: MichelsonOutput[],
  compilerDetails: { name: string, version: string }
};

export const compile = async (paths: string[], settings: LigoCompileSettings = DEFAULT_SETTINGS): Promise<LigoCompilerResult> => {
  // TODO BGC Handle error
  // Checks that the image exists and works as a ligo compiler
  await exec(`docker run --rm -i ${settings.compiler.dockerImage} --help`);

  let results: MichelsonOutput[] = [];

  for (const sourcePath of paths) {
    // TODO BGC Handle error
    const michelson = await compileLigoFile(sourcePath, settings);
    results.push({ sourcePath, michelson });
  }

  return { results, compilerDetails: settings.compiler.details };
};

// Compile single LIGO file
const compileLigoFile = (sourcePath: string, settings: LigoCompileSettings) => {
  return new Promise<string>((resolve, reject) => {
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
      settings.compiler.dockerImage,
      "compile-contract",
      "--michelson-format=json",
      fullInternalSourcePath,
      settings.entryPoint
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
