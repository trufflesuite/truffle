const fse = require("fs-extra");
const _ = require("lodash");

const writeArtifact = (_completeArtifact, _outputPath) => {
  _completeArtifact.updatedAt = new Date().toISOString();
  fse.writeFileSync(
    _outputPath,
    JSON.stringify(_completeArtifact, null, 2),
    "utf8"
  );
};

const finalizeArtifact = (
  _normalizedExistingArtifact,
  _normalizedNewArtifact
) => {
  const _knownNetworks = _.merge(
    {},
    _normalizedExistingArtifact.networks,
    _normalizedNewArtifact.networks
  );
  const _completeArtifact = _.assign(
    {},
    _normalizedExistingArtifact,
    _normalizedNewArtifact,
    { networks: _knownNetworks }
  );
  return _completeArtifact;
};

module.exports = { writeArtifact, finalizeArtifact };
