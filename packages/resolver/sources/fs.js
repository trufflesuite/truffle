const path = require("path");
const fs = require("fs");

class FS {
  constructor(workingDirectory, contractsBuildDirectory) {
    this.workingDirectory = workingDirectory;
    this.contractsBuildDirectory = contractsBuildDirectory;
  }

  require(importPath, searchPath = this.contractsBuildDirectory) {
    const normalizedImportPath = path.normalize(importPath);
    const contractName = this.getContractName(normalizedImportPath, searchPath);

    // If we have an absolute path, only check the file if it's a child of the workingDirectory.
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
    const contractsBuildDirFiles = fs.readdirSync(searchPath);
    const filteredBuildArtifacts = contractsBuildDirFiles.filter(
      file => file.match(".json") != null
    );

    for (const buildArtifact of filteredBuildArtifacts) {
      const artifact = JSON.parse(
        fs.readFileSync(path.resolve(searchPath, buildArtifact))
      );

      if (artifact.sourcePath === sourcePath) {
        return artifact.contractName;
      }
    }

    // fallback
    return path.basename(sourcePath, ".sol");
  }

  async resolve(importPath, importedFrom) {
    importedFrom = importedFrom || "";
    const possiblePaths = [
      importPath,
      path.join(path.dirname(importedFrom), importPath)
    ];

    let body, filePath;

    if (importPath === "truffle/TruffleLogger.sol") {
      const resolvedSource = fs.readFileSync(
        path.resolve(__dirname, path.basename(importPath)),
        {
          encoding: "utf8"
        }
      );
      return { resolvedSource, importPath };
    }

    possiblePaths.forEach(possiblePath => {
      try {
        const resolvedSource = fs.readFileSync(possiblePath, {
          encoding: "utf8"
        });
        body = resolvedSource;
        filePath = possiblePath;
      } catch (error) {
        // do nothing
      }
    });
    return { body, filePath };
  }

  // Here we're resolving from local files to local files, all absolute.
  resolve_dependency_path(importPath, dependencyPath) {
    const dirname = path.dirname(importPath);
    return path.resolve(path.join(dirname, dependencyPath));
  }
}

module.exports = FS;
