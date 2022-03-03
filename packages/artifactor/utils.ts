import fse from "fs-extra";
import { merge, assign } from "lodash";
import type { ContractObject } from "@truffle/contract-schema";

export function writeArtifact(
  completeArtifact: ContractObject,
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
  normalizedExistingArtifact: ContractObject,
  normalizedNewArtifact: ContractObject
) {
  const knownNetworks = merge(
    {},
    normalizedExistingArtifact.networks,
    normalizedNewArtifact.networks
  );
  const completeArtifact = assign(
    {},
    normalizedExistingArtifact,
    normalizedNewArtifact,
    { networks: knownNetworks }
  );
  return completeArtifact;
}
