var path = require("path");
var fs = require("fs");
var eachSeries = require("async/eachSeries");

function FS(working_directory, contracts_build_directory) {
  this.working_directory = working_directory;
  this.contracts_build_directory = contracts_build_directory;
}

FS.prototype.require = function(import_path, search_path) {
  search_path = search_path || this.contracts_build_directory;

  // For Windows: Allow import paths to be either path separator ('\' or '/')
  // by converting all '/' to the default (path.sep);
  import_path = import_path.replace(/\//g, path.sep);

  var contract_name = this.getContractName(import_path, search_path);

  // If we have an absoulte path, only check the file if it's a child of the working_directory.
  if (path.isAbsolute(import_path)) {
    if (import_path.indexOf(this.working_directory) != 0) {
      return null;
    }
    import_path = "./" + import_path.replace(this.working_directory);
  }

  try {
    var result = fs.readFileSync(path.join(search_path, contract_name + ".json"), "utf8");
    return JSON.parse(result);
  } catch (e) {
    return null;
  }
};

FS.prototype.getContractName = function(sourcePath, searchPath) {
  searchPath = searchPath || this.contracts_build_directory;

  var filenames = fs.readdirSync(searchPath);
  for(var i = 0; i < filenames.length; i++) {
    var filename = filenames[i];

    var artifact = JSON.parse(
      fs.readFileSync(path.resolve(searchPath, filename))
    );

    if (artifact.sourcePath == sourcePath) {
      return artifact.contractName;
    }
  };

  // fallback
  return path.basename(sourcePath, ".sol");
}

FS.prototype.resolve = function(import_path, imported_from, callback) {
  imported_from = imported_from || "";

  var possible_paths = [
    import_path,
    path.join(path.dirname(imported_from), import_path)
  ];

  var resolved_body = null;
  var resolved_path = null;

  eachSeries(possible_paths, function(possible_path, finished) {
    if (resolved_body != null) {
      return finished();
    }

    // Check the expected path.
    fs.readFile(possible_path, {encoding: "utf8"}, function(err, body) {
      // If there's an error, that means we can't read the source even if
      // it exists. Treat it as if it doesn't by ignoring any errors.
      // body will be undefined if error.
      if (body) {
        resolved_body = body;
        resolved_path = possible_path;
      }

      return finished();
    });
  }, function(err) {
    if (err) return callback(err);
    callback(null, resolved_body, resolved_path);
  });
};

// Here we're resolving from local files to local files, all absolute.
FS.prototype.resolve_dependency_path = function(import_path, dependency_path) {
  var dirname = path.dirname(import_path);
  return path.resolve(path.join(dirname, dependency_path));
};


module.exports = FS;
