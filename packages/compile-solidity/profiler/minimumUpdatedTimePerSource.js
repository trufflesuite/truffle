const minimumUpdatedTimePerSource = sourceFilesArtifacts => {
  let sourceFilesArtifactsUpdatedTimes = {};
  // Get the minimum updated time for all of a source file's artifacts
  // (note: one source file might have multiple artifacts).
  Object.keys(sourceFilesArtifacts).forEach(sourceFile => {
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
  });
  return sourceFilesArtifactsUpdatedTimes;
};

module.exports = {
  minimumUpdatedTimePerSource
};
