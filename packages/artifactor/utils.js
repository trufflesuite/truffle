const fse = require("fs-extra");
const _ = require("lodash");

const writeArtifact = (completeArtifact, outputPath) => {
  completeArtifact.updatedAt = new Date().toISOString();
  fse.writeFileSync(
    outputPath,
    JSON.stringify(completeArtifact, null, 2),
    "utf8"
  );
};

const finalizeArtifact = (
  normalizedExistingArtifact,
  normalizedNewArtifact
) => {
  const knownNetworks = _.merge(
    {},
    normalizedExistingArtifact.networks,
    normalizedNewArtifact.networks
  );
  const completeArtifact = _.assign(
    {},
    normalizedExistingArtifact,
    normalizedNewArtifact,
    { networks: knownNetworks }
  );
  return completeArtifact;
};

module.exports = { writeArtifact, finalizeArtifact };
