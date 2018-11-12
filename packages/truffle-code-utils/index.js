const Config = require("truffle-config");
const DefaultUtils = require("./lib/");

let config = Config.search();
let CodeUtils;

if (config) {
  config = Config.detect();
  config.CodeUtils
    ? (CodeUtils = config.CodeUtils)
    : (CodeUtils = DefaultUtils);
} else {
  CodeUtils = DefaultUtils;
}
module.exports = CodeUtils;
