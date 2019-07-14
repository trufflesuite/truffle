import fse from "fs-extra";
import _ from "lodash";
import Contract from "truffle-contract";

export function writeArtifact(
  completeArtifact: Contract.TruffleContract,
  outputPath: string
) {
  completeArtifact.updatedAt = new Date().toISOString();
  fse.writeFileSync(
    outputPath,
    JSON.stringify(completeArtifact, null, 2),
    "utf8"
  );
}

export function finalizeArtifact(
  normalizedExistingArtifact: Contract.TruffleContract,
  normalizedNewArtifact: Contract.TruffleContract
) {
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
}
