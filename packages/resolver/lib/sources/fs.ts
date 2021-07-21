import path from "path";
import fs from "fs";

import type { ResolverSource } from "../source";

export class FS implements ResolverSource {
  workingDirectory: string;
  contractsBuildDirectory: string;

  constructor(workingDirectory: string, contractsBuildDirectory: string) {
    this.workingDirectory = workingDirectory;
    this.contractsBuildDirectory = contractsBuildDirectory;
  }

  require(importPath: string, searchPath = this.contractsBuildDirectory) {
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

  getContractName(
    sourcePath: string,
    searchPath = this.contractsBuildDirectory
  ) {
    const contractsBuildDirFiles = fs.readdirSync(searchPath);
    const filteredBuildArtifacts = contractsBuildDirFiles.filter(
      (file: string) => file.match(".json") != null
    );

    for (const buildArtifact of filteredBuildArtifacts) {
      const artifact = JSON.parse(
        fs.readFileSync(path.resolve(searchPath, buildArtifact)).toString()
      );

      if (artifact.sourcePath === sourcePath) {
        return artifact.contractName;
      }
    }

    // fallback
    return path.basename(sourcePath, ".sol");
  }

  async resolve(importPath: string, _importedFrom?: string) {

    if (!path.isAbsolute(importPath)) {
      //the FS resolver should only resolve absolute paths.
      //If things are being done properly, then either:
      //1. this is a top-level path so of course it's absolute; or,
      //2. the import was an explicitly relative path... which has been
      //converted to absolute by the time it's passed here.
      //The bad cases we want to disallow are:
      //3. this is an absolute path in an import (allowed here but disallowed
      //elsewhere)
      //4. this is an implicitly relative path in an import (we have to disallow
      //these, sorry, they cause problems with Solidity's import resolution)
      return { body: undefined, filePath: undefined };
    }

    try {
      const resolvedSource = fs.readFileSync(importPath, {
        encoding: "utf8"
      });
      return { body: resolvedSource, filePath: importPath };
    } catch (error) {
      return { body: undefined, filePath: undefined };
    }

  }

  // Here we're resolving from local files to local files, all absolute.
  resolveDependencyPath(importPath: string, dependencyPath: string) {
    if (
      !(dependencyPath.startsWith("./") || dependencyPath.startsWith("../"))
    ) {
      //if it's *not* a relative path, return it unchanged
      return dependencyPath;
    }
    const dirname = path.dirname(importPath);
    return path.resolve(path.join(dirname, dependencyPath));
  }
}
