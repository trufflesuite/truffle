const Config = require("truffle-config");
const BoxManager = require("./lib/");

let config = Config.search();
let Box;

if (config) {
  config = Config.detect();
  config.BoxManager ? (Box = config.BoxManager) : (Box = BoxManager);
} else {
  Box = BoxManager;
}

module.exports = Box;
