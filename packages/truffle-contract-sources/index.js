const debug = require("debug")("contract-sources");

const path = require("path");
const glob = require("glob");

const DEFAULT_PATTERN = "**/*.sol";

module.exports = function(pattern, callback) {
  // pattern is either a directory (contracts directory), or an absolute path
  // with a glob expression
  if (!glob.hasMagic(pattern)) {
    pattern = path.join(pattern, DEFAULT_PATTERN);
  }

  const globOptions = {
    follow: true  // follow symlinks
  };

  glob(pattern, globOptions, callback);
};
