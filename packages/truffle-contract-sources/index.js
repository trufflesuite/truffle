const debug = require("debug")("contract-sources");
const path = require("path");
const glob = require("glob");
const { promisify } = require("util");
const promisifiedGlob = promisify(glob);

const DEFAULT_PATTERN = "**/*.{sol,vy}";

module.exports = (pattern, callback) => {
  const callbackPassed = typeof callback === "function";
  // pattern is either a directory (contracts directory), or an absolute path
  // with a glob expression
  if (!glob.hasMagic(pattern)) {
    pattern = path.join(pattern, DEFAULT_PATTERN);
  }

  const globOptions = {
    follow: true // follow symlinks
  };

  if (callbackPassed) {
    glob(pattern, globOptions, callback);
  } else {
    return promisifiedGlob(pattern, globOptions);
  }
};
