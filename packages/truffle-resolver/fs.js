const path = require("path");
const fs = require("fs");
const eachSeries = require("async/eachSeries");

class FS {
  constructor(working_directory, contracts_build_directory) {
    this.working_directory = working_directory;
    this.contracts_build_directory = contracts_build_directory;
  }

  require(import_path, search_path = this.contracts_build_directory) {
    // For Windows: Allow import paths to be either path separator ('\' or '/')
    // by converting all '/' to the default (path.sep);
    import_path = import_path.replace(/\//g, path.sep);

    const contract_name = this.getContractName(import_path, search_path);

    // If we have an absoulte path, only check the file if it's a child of the working_directory.
    if (path.isAbsolute(import_path)) {
      if (import_path.indexOf(this.working_directory) !== 0) {
        return null;
      }
      import_path = `./${import_path.replace(this.working_directory)}`;
    }

    try {
      const result = fs.readFileSync(
        path.join(search_path, `${contract_name}.json`),
        "utf8"
      );
      return JSON.parse(result);
    } catch (e) {
      return null;
    }
  }

  getContractName(sourcePath, searchPath = this.contracts_build_directory) {
    let filenames = fs.readdirSync(searchPath);
    filenames = filenames.filter(file => file.match(".json") != null);
    for (let i = 0; i < filenames.length; i++) {
      const filename = filenames[i];

      const artifact = JSON.parse(
        fs.readFileSync(path.resolve(searchPath, filename))
      );

      if (artifact.sourcePath === sourcePath) {
        return artifact.contractName;
      }
    }

    // fallback
    return path.basename(sourcePath, ".sol");
  }

  resolve(import_path, imported_from = "", callback) {
    const possible_paths = [
      import_path,
      path.join(path.dirname(imported_from), import_path)
    ];

    let resolved_body = null;
    let resolved_path = null;

    eachSeries(
      possible_paths,
      (possible_path, finished) => {
        if (resolved_body != null) {
          return finished();
        }

        // Check the expected path.
        fs.readFile(possible_path, { encoding: "utf8" }, (err, body) => {
          // If there's an error, that means we can't read the source even if
          // it exists. Treat it as if it doesn't by ignoring any errors.
          // body will be undefined if error.
          if (body) {
            resolved_body = body;
            resolved_path = possible_path;
          }

          return finished();
        });
      },
      err => {
        if (err) return callback(err);
        callback(null, resolved_body, resolved_path);
      }
    );
  }

  // Here we're resolving from local files to local files, all absolute.
  resolve_dependency_path(import_path, dependency_path) {
    const dirname = path.dirname(import_path);
    return path.resolve(path.join(dirname, dependency_path));
  }
}

module.exports = FS;
