const { open } = require("fs/promises");
const { readdir } = require("fs/promises");
const path = require("path");
const JSONStream = require("JSONStream");
const Migrate = require("@truffle/migrate").default;
const TruffleError = require("@truffle/error");
const os = require("os");

// Search for Push1 (60) to Push(32) 7F + console.log
//                      60 ---- 7F  C O N S O L E . L O G
const consoleLogRex = /[67][0-9a-f]636F6e736F6c652e6c6f67/i;

async function usesConsoleLog(artifactJson) {
  const fd = await open(artifactJson);

  //create a parser to get the value of jsonpath .deployedBytecode
  const parser = JSONStream.parse(["deployedBytecode"]);
  const stream = fd.createReadStream().pipe(parser);

  return new Promise((resolve, reject) => {
    stream.on("data", data => {
      //JSONParse will emit the entire string/value
      //so initiate stream cleanup here
      stream.destroy();
      resolve(consoleLogRex.test(data));
    });

    stream.on("error", err => {
      fd.close();
      reject(err);
    });

    stream.on("close", () => fd.close());
  });
}

module.exports = async function (config) {
  // only check if deploying on MAINNET
  if (config.network_id === 1) {
    try {
      const buildDir = config.contracts_build_directory;
      const maybeArtifacts = await readdir(buildDir);
      const dirtyArtifacts = [];
      for (let i = 0, L = maybeArtifacts.length; i < L; i++) {
        const fn = maybeArtifacts[i];
        if (
          fn.endsWith(".json") &&
          (await usesConsoleLog(path.join(buildDir, fn)))
        ) {
          dirtyArtifacts.push(fn);
        }
      }

      if (dirtyArtifacts.length) {
        //TODO:
        //- get messaging right
        //- emit truffle event indicating dirty contracts detected
        //
        console.warn("Solidity console.log detected in the following assets:");
        console.warn(dirtyArtifacts.join(", "));

        if (config.solidityLog.disableMigration) {
          throw new TruffleError(
            "You are trying to deploy contracts that use console.log." +
              os.EOL +
              "Please fix, or disable this check by setting solidityLog.disableMigration to false"
          );
        }
      }
    } catch (err) {
      // Something went wrong while inspecting for console log.
      // log and error, but don't throw.
      console.warn(
        "Failed to detect Solidity console.log usage:" + os.EOL + err
      );
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
