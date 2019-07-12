import fse from "fs-extra";
import _ from "lodash";
import Schema from "truffle-contract-schema";

export function writeArtifact(
  completeArtifact: Schema.TruffleContract,
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
  normalizedExistingArtifact: Schema.TruffleContract,
  normalizedNewArtifact: Schema.TruffleContract
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
