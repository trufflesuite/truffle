import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:commands:compile:sources");

import { IdObject } from "@truffle/db/meta";
import { Load } from "@truffle/db/loaders/types";
import { PrepareBatch, _, Replace } from "@truffle/db/loaders/batch";
import { generateSourcesLoad } from "@truffle/db/loaders/resources/sources";

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
): Load<
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

  debug("batch %o", batch);
  const sources = yield* generateSourcesLoad(batch);

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
