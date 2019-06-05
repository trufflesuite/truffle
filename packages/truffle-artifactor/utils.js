const fse = require("fs-extra");

const writeArtifact = (_completeArtifact, _outputPath) => {
  _completeArtifact.updatedAt = new Date().toISOString();
  fse.writeFileSync(
    _outputPath,
    JSON.stringify(_completeArtifact, null, 2),
    "utf8"
  );
};

module.exports = { writeArtifact };
