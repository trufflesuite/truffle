/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:project:loadCompile:sources");

import type { _ } from "hkts/src";
import type * as Common from "@truffle/compile-common";

import * as Meta from "@truffle/db/meta";
import type { IdObject, Input } from "@truffle/db/resources";
import { resources } from "@truffle/db/process";

export const process = <
  _I extends
    | {
        contents: string;
        sourcePath: string; // normal sources
      }
    | {
        contents: string;
        name: string; // generated sources
      },
  _O extends _I & {
    db?: {
      source: IdObject<"sources"> | undefined;
    };
  }
>(
  inputs
) => configure(inputs);

const configure = Meta.Batch.configure<{
  structure: (Omit<Common.Compilation, "sources" | "contracts"> & {
    sources: (Common.Source & _)[];
    contracts: (Omit<
      Common.CompiledContract,
      "generatedSources" | "deployedGeneratedSources"
    > & {
      generatedSources?: (Common.GeneratedSource & _)[];
      deployedGeneratedSources?: (Common.GeneratedSource & _)[];
    })[];
  })[];
  breadcrumb: {
    compilationIndex: number;
    sourcePointer:
      | {
          sourceIndex: number;
        }
      | {
          contractIndex: number;
          property: "generatedSources" | "deployedGeneratedSources";
          generatedSourceIndex: number;
        };
  };
  input:
    | {
        contents: string;
        sourcePath: string; // normal sources
      }
    | {
        contents: string;
        name: string; // generated sources
      };
  entry: Input<"sources">;
  result: IdObject<"sources"> | undefined;
  output: {
    db?: {
      source: IdObject<"sources"> | undefined;
    };
  };
}>({
  *iterate({ inputs }) {
    for (const [compilationIndex, { sources, contracts }] of inputs.entries()) {
      for (const [sourceIndex, source] of sources.entries()) {
        yield {
          input: source,
          breadcrumb: {
            compilationIndex,
            sourcePointer: {
              sourceIndex
            }
          }
        };
      }

      for (const [contractIndex, contract] of contracts.entries()) {
        for (const property of [
          "generatedSources",
          "deployedGeneratedSources"
        ] as const) {
          const generatedSources = contract[property];
          if (generatedSources) {
            for (const [
              generatedSourceIndex,
              source
            ] of generatedSources.entries()) {
              yield {
                input: source,
                breadcrumb: {
                  compilationIndex,
                  sourcePointer: {
                    contractIndex,
                    property,
                    generatedSourceIndex
                  }
                }
              };
            }
          }
        }
      }
    }
  },

  find({ inputs, breadcrumb }) {
    const { compilationIndex, sourcePointer } = breadcrumb;
    const compilation = inputs[compilationIndex];

    if ("generatedSourceIndex" in sourcePointer) {
      const { contractIndex, property, generatedSourceIndex } = sourcePointer;

      // @ts-ignore
      return compilation.contracts[contractIndex][property][
        generatedSourceIndex
      ];
    }

    const { sourceIndex } = sourcePointer;
    return compilation.sources[sourceIndex];
  },

  extract({ input }) {
    return {
      contents: input.contents,
      sourcePath: "sourcePath" in input ? input["sourcePath"] : input["name"]
    };
  },

  *process({ entries }) {
    return yield* resources.load("sources", entries);
  },

  // @ts-ignore
  initialize({ inputs }) {
    return inputs.map(compilation => ({
      ...compilation,
      sources: compilation.sources.map(source => ({
        ...source
      })),
      contracts: compilation.contracts.map(contract => ({
        ...contract
      }))
    }));
  },

  convert({ result, input }) {
    return {
      ...input,
      db: {
        source: result
      }
    };
  },

  merge({ outputs, breadcrumb, output }) {
    const { compilationIndex, sourcePointer } = breadcrumb;

    const compilationsBefore = outputs.slice(0, compilationIndex);
    const compilation = outputs[compilationIndex];
    const compilationsAfter = outputs.slice(compilationIndex + 1);

    if ("generatedSourceIndex" in sourcePointer) {
      const { contractIndex, property, generatedSourceIndex } = sourcePointer;
      const contractsBefore = compilation.contracts.slice(0, contractIndex);
      const contract = compilation.contracts[contractIndex];
      const contractsAfter = compilation.contracts.slice(contractIndex + 1);

      // @ts-ignore this will always be defined because we are looking it up
      // via breadcrumb
      const generatedSourcesBefore = contract[property].slice(
        0,
        generatedSourceIndex
      );
      const generatedSource = output;
      // @ts-ignore this will always be defined because we are looking it up
      // via breadcrumb
      const generatedSourcesAfter = contract[property].slice(
        generatedSourceIndex + 1
      );

      return [
        ...compilationsBefore,
        {
          ...compilation,
          contracts: [
            ...contractsBefore,
            {
              ...contract,
              [property]: [
                ...generatedSourcesBefore,
                generatedSource,
                ...generatedSourcesAfter
              ]
            },
            ...contractsAfter
          ]
        },
        ...compilationsAfter
      ];
    }

    const { sourceIndex } = sourcePointer;
    const sourcesBefore = compilation.sources.slice(0, sourceIndex);
    const source = output;
    const sourcesAfter = compilation.sources.slice(sourceIndex + 1);

    return [
      ...compilationsBefore,
      {
        ...compilation,
        sources: [...sourcesBefore, source, ...sourcesAfter]
      },
      ...compilationsAfter
    ];
  }
});
