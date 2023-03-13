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
      stdio: ["pipe", "pipe", "inherit"],
      cwd: workingDirectory,
      shell: true
    });

    let output = "";
    hardhat.stdout.on("data", data => {
      output = `${output}${data}`;
    });

    hardhat.once("close", code => {
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

    // Latin-1 Supplemental block control codes
    const sos = String.fromCodePoint(0x0098); // start of string
    const st = String.fromCodePoint(0x009c); // string terminator
    const prefix = `${sos}truffle-start${st}`;
    const suffix = `${sos}truffle-end${st}`;

    // note the hardhat console instance is spawned with --no-compile which causes it to skip the initial (default) compilation step
    const hardhat = spawn(`npx`, ["hardhat", "console", "--no-compile"], {
      stdio: ["pipe", "pipe", "inherit"],
      cwd: workingDirectory,
      shell: true
    });

    // we'll capture the stdout
    let output = "";
    hardhat.stdout.on("data", data => {
      output = `${output}${data}`;
    });

    // setup close event before writing to stdin because we're sending eof
    hardhat.once("close", code => {
      if (code !== 0) {
        return reject(new Error(`Hardhat exited with non-zero code ${code}`));
      }

      const data = output.slice(
        output.indexOf(prefix) + prefix.length,
        output.indexOf(suffix)
      );

      if (raw) {
        return accept(data);
      }

      try {
        const result = JSON.parse(data);

        return accept(result);
      } catch (error) {
        return reject(error);
      }
    });

    // write to stdin to ask for requested data. this does a few things:
    // - wrap the expression into something that resolves as a Promise.
    //   this ensures that we can handle raw synchronous expressions as well
    //   as Promise-returning expressions.
    // - write the resolved value to the console, using the prefix/suffix
    //   sentinels to ensure Truffle knows what stdout comes from this process,
    //   vs. whatever stdout Hardhat may produce on its own.
    // - unless `raw` is turned on, stringify the resolved value as JSON.
    hardhat.stdin.write(`
      Promise.resolve(${expression})
        .then(${
          raw
            ? `(resolved) => console.log(
                \`${prefix}$\{resolved}${suffix}\`
              )`
            : `(resolved) => console.log(
                \`${prefix}$\{JSON.stringify(resolved)}${suffix}\`
              )`
        })
    `);
    hardhat.stdin.end();
  });
