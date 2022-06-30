const debug = require("debug")("contract-sources");
const path = require("path");
const glob = require("glob");
const { promisify } = require("util");

const DEFAULT_PATTERN = "**/*.{sol,vy,v.py,vyper.py,json,yul}";

module.exports = async pattern => {
  // pattern is either a directory (contracts directory), or an absolute path
  // with a glob expression
  if (!glob.hasMagic(pattern)) {
    pattern = path.join(pattern, DEFAULT_PATTERN);
  }

  const globOptions = {
    follow: true, // follow symlinks
    dot: true //check hidden files and directories
  };

  return await promisify(glob)(pattern, globOptions);
};
