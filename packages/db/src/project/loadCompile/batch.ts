/**
 * @category Internal boilerplate
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:project:loadCompile:batch");

import { _ } from "hkts/src";
import type * as Common from "@truffle/compile-common";

import { Process } from "@truffle/db/process";
import * as Base from "@truffle/db/project/batch";

export type Config = {
  compilation: {};
  contract: {};
  source: {};
  resources: {};
  entry?: any;
  result?: any;
};

export type Resources<C extends Config> = C["resources"];
export type Entry<C extends Config> = C["entry"];
export type Result<C extends Config> = C["result"];
export type Source<C extends Config> = Common.Source & C["source"];
export type Contract<C extends Config> = Common.CompiledContract & C["contract"];
export type Compilation<C extends Config> = Common.Compilation &
  C["compilation"] & {
    contracts: Contract<C>[];
    sources: Source<C>[];
  };

export namespace Compilations {
  export type Structure<_C extends Config> = _[];

  export type Breadcrumb<_C extends Config> = {
    compilationIndex: number;
  };

  export type Batch<C extends Config> = {
    structure: Structure<C>;
    breadcrumb: Breadcrumb<C>;

    input: Compilation<C>;
    output: Compilation<C> & {
      db: Resources<C>;
    };

    entry?: Entry<C>;
    result?: Result<C>;
  };

  export type Options<C extends Config> = Omit<
    Base.Options<Batch<C>>,
    "iterate" | "find" | "initialize" | "merge"
  >;

  export const configure = <C extends Config>(
    options: Options<C>
  ): (<I extends Base.Input<Batch<C>>, O extends Base.Output<Batch<C>>>(
    inputs: Base.Inputs<Batch<C>, I>
  ) => Process<Base.Outputs<Batch<C>, I & O>>) =>
    Base.configure<Batch<C>>({
      *iterate<_I>({ inputs }) {
        for (const [compilationIndex, compilation] of inputs.entries()) {
          yield {
            input: compilation,
            breadcrumb: { compilationIndex }
          };
        }
      },

      find<_I>({ inputs, breadcrumb }) {
        const { compilationIndex } = breadcrumb;

        return inputs[compilationIndex];
      },

      initialize<_I, _O>({ inputs }) {
        return inputs.map(input => ({
          ...input,
          db: {
            ...(input.db || {})
          }
        }));
      },

      merge<I, O>({ outputs, breadcrumb, output }) {
        debug("outputs %o", outputs);
        const { compilationIndex } = breadcrumb;

        const compilationsBefore = outputs.slice(0, compilationIndex);
        const compilation: I & O = output;
        const compilationsAfter = outputs.slice(compilationIndex + 1);

        return [...compilationsBefore, compilation, ...compilationsAfter];
      },

      ...options
    });
}

export namespace Contracts {
  export type Structure<C extends Config> = (
    & Omit<Compilation<C>, "contracts">
    & { contracts: _[]; }
  )[];

  export type Breadcrumb<_C extends Config> = {
    compilationIndex: number;
    contractIndex: number;
  };

  export type Batch<C extends Config> = {
    structure: Structure<C>;
    breadcrumb: Breadcrumb<C>;

    input: Contract<C>;
    output: Contract<C> & { db: Resources<C> };

    entry?: Entry<C>;
    result?: Result<C>;
  };

  export type Options<C extends Config> = Omit<
    Base.Options<Batch<C>>,
    "iterate" | "find" | "initialize" | "find" | "merge"
  >;

  export const configure = <C extends Config>(
    options: Options<C>
  ): (<I extends Base.Input<Batch<C>>, O extends Base.Output<Batch<C>>>(
    inputs: Base.Inputs<Batch<C>, I>
  ) => Process<Base.Outputs<Batch<C>, I & O>>) =>
    Base.configure<Batch<C>>({
      *iterate<_I>({ inputs }) {
        for (const [compilationIndex, { contracts }] of inputs.entries()) {
          for (const [contractIndex, contract] of contracts.entries()) {
            yield {
              input: contract,
              breadcrumb: { contractIndex, compilationIndex }
            };
          }
        }
      },

      find<_I>({ inputs, breadcrumb }) {
        const { compilationIndex, contractIndex } = breadcrumb;

        return inputs[compilationIndex].contracts[contractIndex];
      },

      initialize<I, O>({ inputs }) {
        return inputs.map(compilation => ({
          ...compilation,
          contracts: [] as (I & O)[]
        }));
      },

      merge<I, O>({ outputs, breadcrumb, output }) {
        const { compilationIndex, contractIndex } = breadcrumb;

        const compilationsBefore = outputs.slice(0, compilationIndex);
        const compilation = outputs[compilationIndex];
        const compilationsAfter = outputs.slice(compilationIndex + 1);

        const contractsBefore = compilation.contracts.slice(0, contractIndex);
        const contract: I & O = output;
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

export namespace Sources {
  export type Structure<C extends Config> = (
    & Omit<Compilation<C>, "sources">
    & { sources: _[];
  })[];

  export type Breadcrumb<_C extends Config> = {
    compilationIndex: number;
    sourceIndex: number;
  };

  export type Batch<C extends Config> = {
    structure: Structure<C>;
    breadcrumb: Breadcrumb<C>;

    input: Source<C>;
    output: Source<C> & { db: Resources<C> };

    entry?: Entry<C>;
    result?: Result<C>;
  };

  export type Options<C extends Config> = Omit<
    Base.Options<Batch<C>>,
    "iterate" | "find" | "initialize" | "find" | "merge"
  >;

  export const configure = <C extends Config>(
    options: Options<C>
  ): (<I extends Base.Input<Batch<C>>, O extends Base.Output<Batch<C>>>(
    inputs: Base.Inputs<Batch<C>, I>
  ) => Process<Base.Outputs<Batch<C>, I & O>>) =>
    Base.configure<Batch<C>>({
      *iterate<_I>({ inputs }) {
        for (const [compilationIndex, { sources }] of inputs.entries()) {
          for (const [sourceIndex, source] of sources.entries()) {
            yield {
              input: source,
              breadcrumb: { sourceIndex, compilationIndex }
            };
          }
        }
      },

      find<_I>({ inputs, breadcrumb }) {
        const { compilationIndex, sourceIndex } = breadcrumb;

        return inputs[compilationIndex].sources[sourceIndex];
      },

      initialize<I, O>({ inputs }) {
        return inputs.map(compilation => ({
          ...compilation,
          sources: [] as (I & O)[]
        }));
      },

      merge<I, O>({ outputs, breadcrumb, output }) {
        const { compilationIndex, sourceIndex } = breadcrumb;

        const compilationsBefore = outputs.slice(0, compilationIndex);
        const compilation = outputs[compilationIndex];
        const compilationsAfter = outputs.slice(compilationIndex + 1);

        const sourcesBefore = compilation.sources.slice(0, sourceIndex);
        const source: I & O = output;
        const sourcesAfter = compilation.sources.slice(sourceIndex + 1);

        return [
          ...compilationsBefore,
          {
            ...compilation,
            sources: [...sourcesBefore, source, ...sourcesAfter]
          },
          ...compilationsAfter
        ];
      },

      ...options
    });
}
