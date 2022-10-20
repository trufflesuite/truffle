import type TruffleConfig from "@truffle/config";
import * as Common from "@truffle/compile-common";
import type { Project } from "@truffle/db";
import { fetchAndCompile } from "@truffle/fetch-and-compile";

export interface FetchExternalOptions {
  config: TruffleConfig;
  project: Project.ConnectedProject;
  address: string;
}

export async function fetchExternal({
  config,
  project,
  address
}: FetchExternalOptions): Promise<void> {
  const {
    sourceInfo: { contractName },
    compileResult: result
  } = await fetchAndCompile(address, config);

  if (contractName === undefined) {
    throw new Error(`Contract found at ${address} had no name`);
  }

  const { contracts } = await project.loadCompile({ result });

  const contract = await findContract({
    contracts,
    contractName
  });

  await project.assignNames({
    assignments: {
      contracts: [contract.db.contract]
    }
  });

  const { network } = await project.loadMigrate({
    network: { name: config.network },
    artifacts: [
      {
        ...Common.Shims.NewToLegacy.forContract(contract),
        networks: {
          [config.network_id]: {
            address
          }
        }
      }
    ]
  });

  await project.assignNames({
    assignments: {
      networks: [network]
    }
  });
}

async function findContract<Contract extends Common.CompiledContract>(options: {
  contractName: string | undefined;
  contracts: Contract[];
}): Promise<Contract> {
  const { contractName, contracts } = options;

  // simple case; we get the contract name and it matches exactly one contract
  if (contractName) {
    const matching = contracts.filter(
      contract => contract.contractName === contractName
    );

    if (matching.length === 1) {
      return matching[0];
    }
  }

  throw new Error(`Contract ${contractName} not loaded into @truffle/db.`);
}
