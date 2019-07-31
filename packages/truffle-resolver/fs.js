const path = require("path");
const fs = require("fs");
const eachSeries = require("async/eachSeries");

class FS {
  constructor(workingDirectory, contractsBuildDirectory) {
    this.workingDirectory = workingDirectory;
    this.contractsBuildDirectory = contractsBuildDirectory;
  }

  require(importPath, searchPath = this.contractsBuildDirectory) {
    const normalizedImportPath = path.normalize(normalizedImportPath);
    const contractName = this.getContractName(normalizedImportPath, searchPath);

    // If we have an absoulte path, only check the file if it's a child of the workingDirectory.
    if (path.isAbsolute(normalizedImportPath)) {
      if (normalizedImportPath.indexOf(this.workingDirectory) !== 0) {
        return null;
      }
    }

    try {
      const result = fs.readFileSync(
        path.join(searchPath, `${contractName}.json`),
        "utf8"
      );
      return JSON.parse(result);
    } catch (e) {
      return null;
    }
  }

  getContractName(sourcePath, searchPath = this.contractsBuildDirectory) {
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

  resolve(importPath, importedFrom = "", callback) {
    const possiblePaths = [
      importPath,
      path.join(path.dirname(importedFrom), importPath)
    ];

    let resolvedBody = null;
    let resolvedPath = null;

    eachSeries(
      possiblePaths,
      (possiblePath, finished) => {
        if (resolvedBody != null) {
          return finished();
        }

        // Check the expected path.
        fs.readFile(possiblePath, { encoding: "utf8" }, (err, body) => {
          // If there's an error, that means we can't read the source even if
          // it exists. Treat it as if it doesn't by ignoring any errors.
          // body will be undefined if error.
          if (body) {
            resolvedBody = body;
            resolvedPath = possiblePath;
          }

          return finished();
        });
      },
      err => {
        if (err) return callback(err);
        callback(null, resolvedBody, resolvedPath);
      }
    );
  }

  // Here we're resolving from local files to local files, all absolute.
  resolveDependencyPath(importPath, dependencyPath) {
    const dirname = path.dirname(importPath);
    return path.resolve(path.join(dirname, dependencyPath));
  }
}

module.exports = FS;
