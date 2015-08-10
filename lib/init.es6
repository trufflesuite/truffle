var copy = require("./copy");

var Init = {
  all(config, callback) {
    console.log('Scaffolding complete Truffle app...'.green);
    copy(`${config.truffle_dir}/example`, config.working_dir, callback);
  },
  config(config, callback) {
    console.log('Scaffolding Truffle config...'.green);
    copy(`${config.truffle_dir}/example/config`, `${config.working_dir}/config`, callback);
  },
  contracts(config, callback) {
    console.log('Scaffolding Truffle example contract...'.green);
    copy(`${config.truffle_dir}/example/contracts`, `${config.working_dir}/contracts`, callback);
  },
  tests(config, callback) {
    console.log('Scaffolding Truffle tests...'.green);
    copy(`${config.truffle_dir}/example/test`, `${config.working_dir}/tests`, callback);
  }
}

module.exports = Init
