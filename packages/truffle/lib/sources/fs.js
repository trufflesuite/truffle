var path = require("path");
var fs = require("fs");

function FS(config) {
  this.config = config;
}

FS.prototype.find = function(import_path, callback) {
  var expected_path = path.resolve(import_path);

  fs.readFile(expected_path, {encoding: "utf8"}, function(err, body) {
    // If there's an error, that means we can't read the source even if
    // it exists. Treat it as if it doesn't by ignoring any errors.
    // Perhaps we can do something better here in the future.
    return callback(null, body);
  })
};

// Here we're resolving from local files to local files, all absolute.
FS.prototype.resolve_dependency_path = function(import_path, dependency_path) {
  var dirname = path.dirname(import_path);
  return path.resolve(path.join(dirname, dependency_path));
};

module.exports = FS;
