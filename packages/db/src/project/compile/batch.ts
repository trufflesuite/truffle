import { logger } from "@truffle/db/logger";
const debug = logger("db:project:compile:batch");

import { _ } from "@truffle/db/project/process";
import * as Batch from "@truffle/db/process/batch";

export interface Contract {
  contractName: string;
  abi: any;
  ast: any;
  sourcePath: string;
  source: string;
  sourceMap: string;
  deployedSourceMap: string;
  bytecode: DataModel.BytecodeInput;
  deployedBytecode: DataModel.BytecodeInput;

  db?: {};
}

export interface Compilation {
  compiler: {
    name: string;
    version: string;
  };
  sourceIndexes: string[];
  contracts: Contract[];

  db?: {};
}

export type Config = {
  compilation: {};
  contract: {};
  resources: {};
  entry?: any;
  result?: any;
};

type Resources<C extends Config> = C["resources"];
type Entry<C extends Config> = C["entry"];
type Result<C extends Config> = C["result"];

export namespace Compilations {
  type Structure<_C extends Config> = _[];

  type Breadcrumb<_C extends Config> = {
    compilationIndex: number;
  };

  type Batch<C extends Config> = {
    structure: Structure<C>;
    breadcrumb: Breadcrumb<C>;

    input: C["compilation"] & {
      contracts: C["contract"][];
    };
    output: C["compilation"] & {
      contracts: C["contract"][];
      db: Resources<C>;
    };

    entry?: Entry<C>;
    result?: Result<C>;
  };

  type Options<C extends Config> = Omit<
    Batch.Options<Batch<C>>,
    "iterate" | "find" | "initialize" | "merge"
  >;

  export const generate = <C extends Config>(options: Options<C>) =>
    Batch.configure<Batch<C>>({
      *iterate({ inputs }) {
        for (const [compilationIndex, compilation] of inputs.entries()) {
          yield {
            input: compilation,
            breadcrumb: { compilationIndex }
          };
        }
      },

      find({ inputs, breadcrumb }) {
        const { compilationIndex } = breadcrumb;

        return inputs[compilationIndex];
      },

      initialize<_I>({ inputs }) {
        return inputs.map(input => ({
          ...input,
          db: {
            ...(input.db || {})
          }
        }));
      },

      merge({ outputs, breadcrumb, output }) {
        debug("outputs %o", outputs);
        const { compilationIndex } = breadcrumb;

        const compilationsBefore = outputs.slice(0, compilationIndex);
        const compilation = output;
        const compilationsAfter = outputs.slice(compilationIndex + 1);

        return [...compilationsBefore, compilation, ...compilationsAfter];
      },

      ...options
    });
}

export namespace Contracts {
  type Structure<C extends Config> = (Compilation &
    C["compilation"] & {
      contracts: _[];
    })[];

  type Breadcrumb<_C extends Config> = {
    compilationIndex: number;
    contractIndex: number;
  };

  type Batch<C extends Config> = {
    structure: Structure<C>;
    breadcrumb: Breadcrumb<C>;

    input: C["contract"];
    output: C["contract"] & { db: Resources<C> };

    entry?: Entry<C>;
    result?: Result<C>;
  };

  type Options<C extends Config> = Omit<
    Batch.Options<Batch<C>>,
    "iterate" | "find" | "initialize" | "find" | "merge"
  >;

  export const generate = <C extends Config>(options: Options<C>) =>
    Batch.configure<Batch<C>>({
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

      ...options
    });
}
