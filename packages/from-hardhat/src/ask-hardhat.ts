import { spawn } from "child_process";

import findUp from "find-up";

import { validHardhatConfigFilenames } from "./constants";
import { EnvironmentOptions, withDefaultEnvironmentOptions } from "./options";

/**
 * Returns a Promise to a boolean that is true if and only if
 * the detected or specified environment is part of a Hardhat project.
 *
 * (i.e., if the working directory or any of its parents has a Hardhat config)
 */
export const checkHardhat = async (
  options?: EnvironmentOptions
): Promise<boolean> => {
  const { workingDirectory } = withDefaultEnvironmentOptions(options);

  // search recursively up for a hardhat config
  const hardhatConfigPath = await findUp(validHardhatConfigFilenames, {
    cwd: workingDirectory
  });

  return !!hardhatConfigPath;
};

/**
 * Reads version information via `npx hardhat --version`
 */
export const askHardhatVersion = async (
  options?: EnvironmentOptions
): Promise<string> =>
  new Promise((accept, reject) => {
    const { workingDirectory } = withDefaultEnvironmentOptions(options);

    const hardhat = spawn(`npx`, ["hardhat", "--version"], {
      stdio: "pipe",
      cwd: workingDirectory
    });

    let output = "";
    hardhat.stdout.on("data", data => {
      output = `${output}${data}`;
    });

    // setup close event before writing to stdin because we're sending eof
    hardhat.on("close", code => {
      if (code !== 0) {
        return reject(new Error(`Hardhat exited with non-zero code ${code}`));
      }

      return accept(output);
    });
  });

export interface AskHardhatConsoleOptions {
  // turn off json stringify/parse
  raw?: boolean;
}

export const askHardhatConsole = async (
  expression: string,
  {
    raw = false,
    ...options
  }: AskHardhatConsoleOptions & EnvironmentOptions = {}
): Promise<string | unknown> =>
  new Promise((accept, reject) => {
    const { workingDirectory } = withDefaultEnvironmentOptions(options);

    const hardhat = spawn(`npx`, ["hardhat", "console"], {
      stdio: ["pipe", "pipe", "inherit"],
      cwd: workingDirectory
    });

    // we'll capture the stdout
    let output = "";
    hardhat.stdout.on("data", data => {
      output = `${output}${data}`;
    });

    // setup close event before writing to stdin because we're sending eof
    hardhat.on("close", code => {
      if (code !== 0) {
        return reject(new Error(`Hardhat exited with non-zero code ${code}`));
      }

      if (raw) {
        return accept(output);
      }

      try {
        return accept(JSON.parse(output));
      } catch (error) {
        return reject(error);
      }
    });

    hardhat.stdin.write(`
      Promise.resolve(${expression})
        .then(${
          raw
            ? `console.log`
            : `(resolved) => console.log(JSON.stringify(resolved))`
        })
    `);
    hardhat.stdin.end();
  });
