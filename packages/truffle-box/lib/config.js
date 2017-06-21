var fs = require("fs-extra");

function setDefaults(config) {
  config = config || {};

  return {
    ignore: config.ignore || [],
    commands: config.commands || {
      "compile": "truffle compile",
      "migrate": "truffle migrate",
      "test": "truffle test"
    },
    hooks: config.hooks || {
      "post-unpack": "npm install"
    }
  };
}

function read(path) {
  return fs.readFile(path)
    .catch(function() { return "{}"; })
    .then(JSON.parse)
    .then(setDefaults);
}

module.exports = {
  read: read
}
