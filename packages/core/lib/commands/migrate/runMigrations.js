const { createReadStream } = require("fs");
const { readdir } = require("fs/promises");
const path = require("path");
const JSONStream = require("JSONStream");
const Migrate = require("@truffle/migrate").default;
const TruffleError = require("@truffle/error");
const os = require("os");
const debug = require("debug")("migrate:run");

// Search for Push1 (60) to Push(32) 7F + console.log
//                      60 ---- 7F  C O N S O L E . L O G
const consoleLogRex = /[67][0-9a-f]636F6e736F6c652e6c6f67/i;

async function usesConsoleLog(artifactJson) {
  const debugLog = debug.extend("test");
  debugLog("Artifact: %o", artifactJson);

  //create a parser to get the value of jsonpath .deployedBytecode
  const parser = JSONStream.parse(["deployedBytecode"]);
  const stream = createReadStream(artifactJson).pipe(parser);

  return new Promise((resolve, reject) => {
    stream.on("data", data => {
      //JSONParse will emit the entire string/value
      //so initiate stream cleanup here
      stream.destroy();
      const usesConsoleLog = consoleLogRex.test(data);
      debugLog("usesConsoleLog:", usesConsoleLog);
      resolve(usesConsoleLog);
    });

    stream.on("error", err => {
      stream.destroy();
      debugLog("onError: %o", err);
      reject(err);
    });
  });
}

module.exports = async function (config) {
  // only check if deploying on MAINNET
  const dirtyArtifacts = [];
  let continueTesting = true;
  const debugLog = debug.extend("guard");
  debugLog("config.network_id", config.network_id);
  debugLog("config.solidityLog", config.solidityLog);
  if (config.network_id === 1) {
    debugLog("solidityLog guard for mainnet");
    try {
      const buildDir = config.contracts_build_directory;
      const maybeArtifacts = await readdir(buildDir);
      for (let i = 0, L = maybeArtifacts.length; i < L; i++) {
        const fn = maybeArtifacts[i];
        if (
          fn.endsWith(".json") &&
          (await usesConsoleLog(path.join(buildDir, fn)))
        ) {
          dirtyArtifacts.push(fn);
        }
      }
    } catch (err) {
      debugLog("Unexpected error %o:", err);
      // Something went wrong while inspecting for console log.
      // log and warning and skip the remaining logic in this
      // branch
      continueTesting = false;
      console.warn();
      console.warn(
        "Failed to detect Solidity console.log usage:" + os.EOL + err
      );
    }

    debugLog("continueTesting", continueTesting);
    debugLog("dirtyArtifacts.length", dirtyArtifacts.length);
    debugLog(
      "config.solidityLog.disableMigrate",
      config.solidityLog.disableMigrate
    );

    if (continueTesting && dirtyArtifacts.length) {
      console.warn(
        `${os.EOL}Solidity console.log detected in the following assets:`
      );
      console.warn(dirtyArtifacts.join(", "));
      console.warn();

      if (config.solidityLog.disableMigrate) {
        throw new TruffleError(
          "You are trying to deploy contracts that use console.log." +
            os.EOL +
            "Please fix, or disable this check by setting solidityLog.disableMigrate to false" +
            os.EOL
        );
      }
    }
  }

  if (config.f) {
    return await Migrate.runFrom(config.f, config);
  } else {
    const needsMigrating = await Migrate.needsMigrating(config);

    if (needsMigrating) {
      return await Migrate.run(config);
    } else {
      config.logger.log("Network up to date.");
    }
  }
};
