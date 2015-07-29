var copy = require("./copy");

var Init = {
  all(config, callback) {
    copy(`${config.truffle_dir}/example`, config.working_dir, callback);
  },
  config(config, callback) {
    copy(`${config.truffle_dir}/example/config`, `${config.working_dir}/config`, callback);
  },
  contracts(config, callback) {
    copy(`${config.truffle_dir}/example/contracts`, `${config.working_dir}/contracts`, callback);
  },
  tests(config, callback) {
    copy(`${config.truffle_dir}/example/test`, `${config.working_dir}/tests`, callback);
  }
}

module.exports = Init
