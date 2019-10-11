const { callbackify, promisify } = require("util");
const findContracts = promisify(require("@truffle/contract-sources"));

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

module.exports = Common;
