import { logger } from "@truffle/db/logger";
const debug = logger("db:project:compile:sources");

import {
  IdObject,
  generate,
  Process,
  _,
  configure
} from "@truffle/db/project/process";

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
  const { batch, unbatch } = prepareBatch(compilations);

  const sources = yield* generate.load("sources", batch);

  const results = unbatch(sources);

  return results;
}

const prepareBatch = configure<
  (Compilation & {
    contracts: _[];
  })[],
  {
    compilationIndex: number;
    contractIndex: number;
  },
  Contract,
  Contract & { db: { source: IdObject<DataModel.Source> } },
  IdObject<DataModel.Source>,
  DataModel.SourceInput
>({
  *iterate({ inputs }) {
    for (const [compilationIndex, { contracts }] of inputs.entries()) {
      for (const [contractIndex, contract] of contracts.entries()) {
        yield {
          input: contract,
          breadcrumb: { contractIndex, compilationIndex }
        };
      }
    }
  },

  find({ inputs, breadcrumb }) {
    const { compilationIndex, contractIndex } = breadcrumb;

    return inputs[compilationIndex].contracts[contractIndex];
  },

  initialize({ inputs }) {
    return inputs.map(compilation => ({
      ...compilation,
      contracts: []
    }));
  },

  merge({ outputs, breadcrumb, output }) {
    const { compilationIndex, contractIndex } = breadcrumb;

    const compilationsBefore = outputs.slice(0, compilationIndex);
    const compilation = outputs[compilationIndex];
    const compilationsAfter = outputs.slice(compilationIndex + 1);

    const contractsBefore = compilation.contracts.slice(0, contractIndex);
    const contract = output;
    const contractsAfter = compilation.contracts.slice(contractIndex + 1);

    return [
      ...compilationsBefore,
      {
        ...compilation,
        contracts: [...contractsBefore, contract, ...contractsAfter]
      },
      ...compilationsAfter
    ];
  },

  extract({ input: { sourcePath, source: contents } }) {
    return { sourcePath, contents };
  },

  convert({ result: source, input: contract }) {
    return {
      ...contract,
      db: {
        source
      }
    };
  }
});
