const debug = require("debug")("contract-sources");
const path = require("path");
const glob = require("glob");
const { promisify } = require("util");

const sources = require("../sources");

const DEFAULT_PATTERN = "**/*.{sol,vy}";

const findContracts = (pattern, callback) => {
  const callbackPassed = typeof callback === "function";
  // pattern is either a directory (contracts directory), or an absolute path
  // with a glob expression
  if (!glob.hasMagic(pattern)) {
    pattern = path.join(pattern, DEFAULT_PATTERN);
  }

  const globOptions = {
    follow: true // follow symlinks
  };

  return promisify(glob)(pattern, globOptions)
    .then(files => {
      if (callbackPassed) {
        callback(null, files);
      } else {
        return files;
      }
    })
    .catch(error => {
      if (callbackPassed) {
        callback(error);
      } else {
        throw error;
      }
    });
};

const resolveSource = function(importPath, importedFrom, options) {
  const SOURCES = sources(options);
  for (let source of SOURCES) {
    const { body, filePath } = source.resolve(importPath, importedFrom);
    if (body) return { body, filePath, source };
  }

  let message = "Could not find " + importPath + " from any sources";
  if (importedFrom) message += "; imported from " + importedFrom;
  throw new Error(message);
}

module.exports = {
  findContracts,
  resolveSource
}
