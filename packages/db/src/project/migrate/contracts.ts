import { logger } from "@truffle/db/logger";
const debug = logger("db:project:migrate:networks");

import gql from "graphql-tag";
import {
  resources,
  IdObject,
  Process,
  PrepareBatch,
  _
} from "@truffle/db/project/process";

interface Artifact {
  networks?: any;
  db: {
    contract: IdObject<DataModel.Contract>;
  };
}

export function* generateContracts(options: {
  network: any;
  artifacts: Artifact[];
}): Process<{
  network: any;
  artifacts: {
    networks?: any;
    db: {
      contract: DataModel.Contract;
    };
  }[];
}> {
  const { batch, unbatch } = prepareContractsBatch(options);

  const contracts = yield* resources.find(
    "contracts",
    batch.map(({ id }) => id),
    gql`
      fragment Bytecode on Bytecode {
        id
        linkReferences {
          name
        }
      }

      fragment ContractBytecodes on Contract {
        id
        callBytecode {
          ...Bytecode
        }
        createBytecode {
          ...Bytecode
        }
      }
    `
  );

  return unbatch(contracts);
}

const prepareContractsBatch: PrepareBatch<
  {
    network: any;
    artifacts: {
      networks?: any;
      db: {
        contract: _;
      };
    }[];
  },
  IdObject<DataModel.Contract>,
  DataModel.Contract
> = structured => {
  const batch = [];
  const breadcrumbs: {
    [index: number]: {
      artifactIndex: number;
    };
  } = {};

  for (const [artifactIndex, artifact] of structured.artifacts.entries()) {
    const {
      db: { contract }
    } = artifact;

    breadcrumbs[batch.length] = {
      artifactIndex
    };

    batch.push(contract);
  }

  const unbatch = (results: DataModel.Contract[]) => {
    const artifacts = [...structured.artifacts];

    for (const [index, result] of results.entries()) {
      const { artifactIndex } = breadcrumbs[index];

      artifacts[artifactIndex] = {
        ...artifacts[artifactIndex],
        db: {
          ...artifacts[artifactIndex].db,
          // @ts-ignore
          contract: result
        }
      };
    }

    return {
      ...structured,
      artifacts
    };
  };

  return { batch, unbatch };
};
