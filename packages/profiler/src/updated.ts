import * as path from "path";
import * as fs from "fs";

import debugModule from "debug";
const debug = debugModule("profiler:updated");

import type { ContractObject } from "@truffle/contract-schema/spec";

export interface UpdatedOptions {
  paths: string[];
  contractsBuildDirectory: string;
}

export async function updated({
  paths,
  contractsBuildDirectory,
}: UpdatedOptions): Promise<string[]> {
  const artifacts = readAndParseArtifactFiles(
    paths,
    contractsBuildDirectory
  );
  const artifactsUpdatedTime = minimumUpdatedTimePerSource(
    artifacts
  );
  return findUpdatedFiles(
    artifacts,
    artifactsUpdatedTime
  );
}

interface SourceFilesArtifacts {
  [filePath: string]: ContractObject[];
}

interface SourceFilesArtifactsUpdatedTimes {
  [filePath: string]: number; // ms since epoch
}

const getKeyFromPath = (fsPath: string): string => {
  debug("getKeyFromPath", fsPath);
  debug(new Error().stack);
  //HACK: Not sure why there would be no source paths. We should enforce that
  //sources have paths. Tests could introduces sources with out paths, and
  //maybe  the compile external workflow?
  return fsPath ? fsPath.split(path.sep).join("/") : fsPath;
}

function readAndParseArtifactFiles(
  paths: string[],
  contracts_build_directory: string
): SourceFilesArtifacts {
  const sourceFilesArtifacts: SourceFilesArtifacts = {};
  // Get all the source files and create an object out of them.
  paths.forEach((sourceFile) => {
    sourceFilesArtifacts[getKeyFromPath(sourceFile)] = [];
  });
  // Get all the artifact files, and read them, parsing them as JSON
  let buildFiles: string[] = fs.existsSync(contracts_build_directory)
    ? fs.readdirSync(contracts_build_directory)
    : [];


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
      const key = getKeyFromPath(data.sourcePath);
      // In case there are artifacts from other source locations.
      if (sourceFilesArtifacts[key] == null) {
        sourceFilesArtifacts[key] = [];
      }

      sourceFilesArtifacts[key].push(data);
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
  sourceArtifacts: SourceFilesArtifacts,
  sourceArtifactsUpdatedTimes: SourceFilesArtifactsUpdatedTimes
): string[] {
  // Stat all the source files, getting there updated times, and comparing them to
  // the artifact updated times.
  const sourceFiles = Object.keys(sourceArtifacts);

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
    .filter((sourceFile, index) => {
      const stat = sourceFileStats[index];

      // Ignore updating artifacts if source file has been removed.
      if (stat == null) return;

      const artifactsUpdatedTime =
        sourceArtifactsUpdatedTimes[sourceFile] || 0;
      const sourceFileUpdatedTime = (
        stat.mtimeMs || stat.ctimeMs
      );

      if (sourceFileUpdatedTime > artifactsUpdatedTime) return sourceFile;
    });
}

function minimumUpdatedTimePerSource(
  sourceFilesArtifacts: SourceFilesArtifacts
) {
  let updatedTimes: SourceFilesArtifactsUpdatedTimes = {};
  // Get the minimum updated time for all of a source file's artifacts
  // (note: one source file might have multiple artifacts).
  for (const sourceFile of Object.keys(sourceFilesArtifacts)) {
    const artifacts = sourceFilesArtifacts[sourceFile];
    let minTime = artifacts.reduce(
      (minimum, current) => {
        const updatedAt = new Date(current.updatedAt).getTime();
        return updatedAt < minimum ? updatedAt : minimum;
      },
      Number.MAX_SAFE_INTEGER
    );

    // Empty artifacts array?
    if (minTime === Number.MAX_SAFE_INTEGER) {
      minTime = 0;
    }
    updatedTimes[sourceFile] = minTime;
  }
  return updatedTimes;
}
