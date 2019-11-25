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

const resolve = function(options, importPath, importedFrom) {
  const self = this;
  const SOURCES = sources(options);

  if (typeof importedFrom === "function") {
    callback = importedFrom;
    importedFrom = null;
  }

  let resolved_body = null;
  let resolved_path = null;
  let current_index = -1;
  let current_source;

  whilst(
    function() {
      return !resolved_body && current_index < self.sources.length - 1;
    },
    function(next) {
      current_index += 1;
      current_source = self.sources[current_index];

      current_source.resolve(importPath, importedFrom, function(
        err,
        body,
        file_path
      ) {
        if (!err && body) {
          resolved_body = body;
          resolved_path = file_path;
        }
        next(err);
      });
    },
    function(err) {
      if (err) return callback(err);

      if (!resolved_body) {
        var message = "Could not find " + importPath + " from any sources";

        if (importedFrom) {
          message += "; imported from " + importedFrom;
        }

        return callback(new Error(message));
      }

      callback(null, resolved_body, resolved_path, current_source);
    }
  );
}

module.exports = {
  findContracts,
  resolve
}
