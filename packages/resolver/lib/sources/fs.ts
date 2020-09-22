import path from "path";
import fs from "fs";

import { ResolverSource } from "../source";

export class FS implements ResolverSource {
  workingDirectory: string;
  contractsBuildDirectory: string;

  constructor(workingDirectory: string, contractsBuildDirectory: string) {
    this.workingDirectory = workingDirectory;
    this.contractsBuildDirectory = contractsBuildDirectory;
  }

  require(importPath: string, searchPath = this.contractsBuildDirectory) {
    const normalizedImportPath = path.normalize(importPath);

    // If we have an absolute path, only check the file if it's a child of the workingDirectory.
    if (path.isAbsolute(normalizedImportPath)) {
      if (normalizedImportPath.indexOf(this.workingDirectory) !== 0) {
        return null;
      }
    }

    const result = this.searchForArtifact(normalizedImportPath, searchPath);
    return result;
  }

  /**
   *
   * @param importSourcePath The string in the require/import statement
   *   This could be artifacts.require("Migrations") => "Migrations", or even
   *   artifacts.require("Migrations.sol") => "Migrations.sol". This function handles both
   * @param searchPath The location to search
   * @returns The artifact as a JSON object
   */
  searchForArtifact(
    importSourcePath: string,
    searchPath = this.contractsBuildDirectory
  ) {
    // most cases we can use the `{name}.sol -> {name}.json` convention
    const likelyFileBasename = path.basename(importSourcePath, ".sol");
    const likelyArtifactString = fs.readFileSync(
      path.join(searchPath, `${likelyFileBasename}.json`),
      "utf8"
    );

    let likelyArtifact;
    try {
      if (likelyArtifactString) {
        likelyArtifact = JSON.parse(likelyArtifactString);
        return likelyArtifact;
      }
    } catch (e) {
      // do nothing, we'll handle this by doing a deeper search
    }

    // we couldn't use the `{name}.sol --> {name}.json` convention, let's search

    const contractsBuildDirFiles = fs.readdirSync(searchPath);
    const filteredBuildArtifacts = contractsBuildDirFiles.filter(
      // we don't care about files that don't have the json extension
      // we also don't care about the file we already tried
      (file: string) =>
        file.match(".json") != null && file !== `${likelyFileBasename}.json`
    );

    for (const buildArtifact of filteredBuildArtifacts) {
      const artifactString = fs.readFileSync(
        path.resolve(searchPath, buildArtifact),
        { encoding: "utf8" }
      );
      try {
        if (artifactString) {
          const artifact = JSON.parse(artifactString);

          if (
            path.basename(artifact.sourcePath, ".sol") ===
              path.basename(importSourcePath, ".sol") ||
            artifact.contractName === path.basename(importSourcePath, ".sol")
          ) {
            return artifact;
          }
        }
      } catch (e) {
        // do nothing, keep searching
      }
    }

    // we didn't find anything valid here
    return null;
  }

  async resolve(importPath: string, importedFrom: string) {
    importedFrom = importedFrom || "";
    const possiblePaths = [
      importPath,
      path.join(path.dirname(importedFrom), importPath)
    ];

    let body, filePath;
    for (const possiblePath of possiblePaths) {
      try {
        const resolvedSource = fs.readFileSync(possiblePath, {
          encoding: "utf8"
        });
        body = resolvedSource;
        filePath = possiblePath;

        return { body, filePath };
      } catch (error) {
        // do nothing
      }
    }

    return { body, filePath };
  }

  // Here we're resolving from local files to local files, all absolute.
  resolveDependencyPath(importPath: string, dependencyPath: string) {
    const dirname = path.dirname(importPath);
    return path.resolve(path.join(dirname, dependencyPath));
  }
}
