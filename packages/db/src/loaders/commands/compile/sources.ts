import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:commands:compile:sources");

import { IdObject } from "@truffle/db/meta";
import { Process, resources } from "@truffle/db/project/process";
import { PrepareBatch, _, Replace } from "@truffle/db/loaders/batch";

interface Contract {
  sourcePath: string;
  source: string;

  abi: any;
  contractName: any;
  ast: any;
  sourceMap: any;
  deployedSourceMap: any;
  bytecode: any;
  deployedBytecode: any;

  db?: any;
}

interface Compilation {
  compiler: any;
  sourceIndexes: any;
  contracts: Contract[];
}

export function* generateCompilationsSourcesLoad(
  compilations: Compilation[]
): Process<
  (Compilation & {
    contracts: (Contract & {
      db: {
        source: IdObject<DataModel.Source>;
      };
    })[];
  })[]
> {
  debug("preparing to add sources");
  const { batch, unbatch } = prepareSourcesBatch(compilations);

  const sources = yield* resources.load("sources", batch);

  const results = unbatch(sources);

  return results;
}

const prepareSourcesBatch: PrepareBatch<
  Replace<Compilation, { contracts: _[] }>[],
  Contract,
  Contract & { db: { source: IdObject<DataModel.Source> } },
  DataModel.SourceInput,
  IdObject<DataModel.Source>
> = structured => {
  const batch: DataModel.SourceInput[] = [];
  const breadcrumbs: {
    [index: number]: {
      compilationIndex: number;
      contractIndex: number;
    };
  } = {};

  for (const [compilationIndex, { contracts }] of structured.entries()) {
    for (const [
      contractIndex,
      { sourcePath, source: contents }
    ] of contracts.entries()) {
      breadcrumbs[batch.length] = { contractIndex, compilationIndex };

      batch.push({ sourcePath, contents });
    }
  }

  const unbatch = results => {
    const compilations = [];

    for (const [index, result] of results.entries()) {
      const { compilationIndex, contractIndex } = breadcrumbs[index];

      if (!compilations[compilationIndex]) {
        compilations[compilationIndex] = {
          ...structured[compilationIndex],
          contracts: []
        };
      }

      compilations[compilationIndex].contracts[contractIndex] = {
        ...structured[compilationIndex].contracts[contractIndex],
        db: {
          ...(structured[compilationIndex].contracts[contractIndex].db || {}),
          source: result
        }
      };
    }

    return compilations;
  };

  return { batch, unbatch };
};
