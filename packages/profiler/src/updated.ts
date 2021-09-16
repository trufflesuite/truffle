import * as path from "path";
import * as fs from "fs";

import type { ContractObject } from "@truffle/contract-schema/spec";

export interface UpdatedOptions {
  paths: string[];
  contractsBuildDirectory: string;
}

export async function updated({
  paths,
  contractsBuildDirectory,
}: UpdatedOptions): Promise<string[]> {
  const sourceFilesArtifacts = readAndParseArtifactFiles(
    paths,
    contractsBuildDirectory
  );
  const sourceFilesArtifactsUpdatedTimes = minimumUpdatedTimePerSource(
    sourceFilesArtifacts
  );
  return findUpdatedFiles(
    sourceFilesArtifacts,
    sourceFilesArtifactsUpdatedTimes
  );
}

interface SourceFilesArtifacts {
  [filePath: string]: ContractObject[];
}

interface SourceFilesArtifactsUpdatedTimes {
  [filePath: string]: number; // ms since epoch
}

function readAndParseArtifactFiles(
  paths: string[],
  contracts_build_directory: string
): SourceFilesArtifacts {
  const sourceFilesArtifacts: SourceFilesArtifacts = {};
  // Get all the source files and create an object out of them.
  paths.forEach((sourceFile) => {
    sourceFilesArtifacts[sourceFile] = [];
  });
  // Get all the artifact files, and read them, parsing them as JSON
  let buildFiles: string[];
  try {
    buildFiles = fs.readdirSync(contracts_build_directory);
  } catch (error) {
    // The build directory may not always exist.
    if (error.message.includes("ENOENT: no such file or directory")) {
      // Ignore it.
      buildFiles = [];
    } else {
      throw error;
    }
  }

  buildFiles = buildFiles.filter((file) => path.extname(file) === ".json");
  const jsonData = buildFiles.map((file) => {
    const body = fs.readFileSync(
      path.join(contracts_build_directory, file),
      "utf8"
    );
    return { file, body };
  });

  for (let i = 0; i < jsonData.length; i++) {
    try {
      const data: ContractObject = JSON.parse(jsonData[i].body);

      // In case there are artifacts from other source locations.
      if (sourceFilesArtifacts[data.sourcePath] == null) {
        sourceFilesArtifacts[data.sourcePath] = [];
      }

      sourceFilesArtifacts[data.sourcePath].push(data);
    } catch (error) {
      // JSON.parse throws SyntaxError objects
      if (error instanceof SyntaxError) {
        throw new Error("Problem parsing artifact: " + jsonData[i].file);
      } else {
        throw error;
      }
    }
  }
  return sourceFilesArtifacts;
}

function findUpdatedFiles(
  sourceFilesArtifacts: SourceFilesArtifacts,
  sourceFilesArtifactsUpdatedTimes: SourceFilesArtifactsUpdatedTimes
): string[] {
  // Stat all the source files, getting there updated times, and comparing them to
  // the artifact updated times.
  const sourceFiles = Object.keys(sourceFilesArtifacts);

  let sourceFileStats: (fs.Stats | null)[];
  sourceFileStats = sourceFiles.map((file) => {
    try {
      return fs.statSync(file);
    } catch (error) {
      // Ignore it. This means the source file was removed
      // but the artifact file possibly exists. Return null
      // to signfy that we should ignore it.
      return null;
    }
  });

  return sourceFiles
    .map((sourceFile, index) => {
      const sourceFileStat = sourceFileStats[index];

      // Ignore updating artifacts if source file has been removed.
      if (sourceFileStat == null) return;

      const artifactsUpdatedTime =
        sourceFilesArtifactsUpdatedTimes[sourceFile] || 0;
      const sourceFileUpdatedTime = (
        sourceFileStat.mtime || sourceFileStat.ctime
      ).getTime();

      if (sourceFileUpdatedTime > artifactsUpdatedTime) return sourceFile;
    })
    .filter((file) => file);
}

function minimumUpdatedTimePerSource(
  sourceFilesArtifacts: SourceFilesArtifacts
) {
  let sourceFilesArtifactsUpdatedTimes: SourceFilesArtifactsUpdatedTimes = {};
  // Get the minimum updated time for all of a source file's artifacts
  // (note: one source file might have multiple artifacts).
  for (const sourceFile of Object.keys(sourceFilesArtifacts)) {
    const artifacts = sourceFilesArtifacts[sourceFile];

    sourceFilesArtifactsUpdatedTimes[sourceFile] = artifacts.reduce(
      (minimum, current) => {
        const updatedAt = new Date(current.updatedAt).getTime();

        if (updatedAt < minimum) {
          return updatedAt;
        }
        return minimum;
      },
      Number.MAX_SAFE_INTEGER
    );

    // Empty array?
    if (
      sourceFilesArtifactsUpdatedTimes[sourceFile] === Number.MAX_SAFE_INTEGER
    ) {
      sourceFilesArtifactsUpdatedTimes[sourceFile] = 0;
    }
  }
  return sourceFilesArtifactsUpdatedTimes;
}
