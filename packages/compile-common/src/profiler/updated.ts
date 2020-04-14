import { readAndParseArtifactFiles } from "./readAndParseArtifactFiles";
import { minimumUpdatedTimePerSource } from "./minimumUpdatedTimePerSource";
import { findUpdatedFiles } from "./findUpdatedFiles";

export interface UpdatedOptions {
  getFiles(): Promise<string[]>;
  contractsBuildDirectory: string;
}

export async function updated({
  getFiles,
  contractsBuildDirectory
}: UpdatedOptions): Promise<string[]> {
  let sourceFilesArtifacts = {};
  let sourceFilesArtifactsUpdatedTimes = {};

  const sourceFiles = await getFiles();
  sourceFilesArtifacts = readAndParseArtifactFiles(
    sourceFiles,
    contractsBuildDirectory
  );
  sourceFilesArtifactsUpdatedTimes = minimumUpdatedTimePerSource(
    sourceFilesArtifacts
  );
  const updatedFiles = findUpdatedFiles(
    sourceFilesArtifacts,
    sourceFilesArtifactsUpdatedTimes
  );
  return updatedFiles;
}
