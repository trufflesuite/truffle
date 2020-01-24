const path = require("path");
const { promisify } = require("util");
const findContracts = promisify(require("@truffle/contract-sources"));
const updatedFiles = require("./utils");

const Common = {};

Common.all = async (compile, options, callback) => {
  let files;
  try {
    files = await findContracts(options.contracts_directory);
  } catch (error) {
    return callback(error);
  }
  options.paths = files;
  compile.with_dependencies(options, callback);
};

Common.necessary = async (compile, options, callback) => {
  let updated;
  options.logger = options.logger || console;

  try {
    updated = await updatedFiles(options);
  } catch (error) {
    return callback(error);
  }

  if (updated.length === 0 && options.quiet !== true)
    return callback(null, [], {});

  options.paths = updated;
  compile.with_dependencies(options, callback);
};

Common.display = (paths, { quiet, working_directory, events }) => {
  if (quiet !== true) {
    if (!Array.isArray(paths)) paths = Object.keys(paths);

    const blacklistRegex = /^truffle\//;

    const sources = paths
      .sort()
      .map(contract => {
        if (path.isAbsolute(contract))
          contract = `.${path.sep}${path.relative(
            working_directory,
            contract
          )}`;
        if (contract.match(blacklistRegex)) return;
        return contract;
      })
      .filter(contract => contract);
    events.emit("compile:sourcesToCompile", {
      sourceFileNames: sources
    });
  }
};

// append CONTRACT_EXT_PATTERN to contracts_directory in options and return updated options
Common.updateContractsDirectory = (options, CONTRACT_EXT_PATTERN) =>
  options.with({
    contracts_directory: path.join(
      options.contracts_directory,
      CONTRACT_EXT_PATTERN
    )
  });

// expose until adjusted for new compile-solidity interface
Common.updatedFiles = updatedFiles;

module.exports = Common;
