const fse = require("fs-extra");

function setDefaults(config = {}) {
  const hooks = config.hooks || {};

  return {
    ignore: config.ignore || [],
    commands: config.commands || {
      compile: "truffle compile",
      migrate: "truffle migrate",
      test: "truffle test"
    },
    hooks: {
      "post-unpack": hooks["post-unpack"] || ""
    }
  };
}

function read(path) {
  return fse
    .readFile(path)
    .catch(() => "{}")
    .then(JSON.parse)
    .then(setDefaults);
}

module.exports = {
  read,
  setDefaults
};
