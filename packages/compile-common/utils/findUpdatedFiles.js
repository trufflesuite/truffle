const fse = require("fs-extra");

const findUpdatedFiles = (
  sourceFilesArtifacts,
  sourceFilesArtifactsUpdatedTimes
) => {
  // Stat all the source files, getting there updated times, and comparing them to
  // the artifact updated times.
  const sourceFiles = Object.keys(sourceFilesArtifacts);

  let sourceFileStats;
  sourceFileStats = sourceFiles.map(file => {
    try {
      return fse.statSync(file);
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
    .filter(file => file);
};

module.exports = {
  findUpdatedFiles
};
