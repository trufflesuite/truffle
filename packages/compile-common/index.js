const { callbackify, promisify } = require("util");
const findContracts = promisify(require("@truffle/contract-sources"));
const { ProfilerUpdated } = promisify(
  require("@truffle/compile-solidity/profiler").updated
);

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
    updated = await ProfilerUpdated(options);
  } catch (error) {
    return callback(error);
  }

  if (updated.length === 0 && options.quiet !== true)
    return callback(null, [], {});

  options.paths = updated;
  compile.with_dependencies(options, callback);
};

module.exports = Common;
