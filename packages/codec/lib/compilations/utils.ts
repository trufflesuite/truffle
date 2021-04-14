import debugModule from "debug";
const debug = debugModule("codec:compilations:utils");

import * as Ast from "@truffle/codec/ast";
import * as Compiler from "@truffle/codec/compiler";
import {
  ContractObject as Artifact,
  GeneratedSources
} from "@truffle/contract-schema/spec";
import * as Common from "@truffle/compile-common";
import { Compilation, Contract, Source, VyperSourceMap } from "./types";
import { shimEvmContracts } from "./utils-evm";

export function shimCompilations(
  inputCompilations: Common.Compilation[],
  shimmedCompilationIdPrefix = "shimmedcompilation"
): Compilation[] {
  return inputCompilations.map((compilation, compilationIndex) =>
    shimCompilation(
      compilation,
      `${shimmedCompilationIdPrefix}Number(${compilationIndex})`
    )
  );
}

function shimCompilation(
  inputCompilation: Common.Compilation,
  shimmedCompilationId = "shimmedcompilation"
): Compilation {
  return {
    ...shimContracts(inputCompilation.contracts, {
      files: inputCompilation.sourceIndexes,
      sources: inputCompilation.sources,
      shimmedCompilationId,
      compiler: inputCompilation.compiler
    }),
    compiler: inputCompilation.compiler
  };
}

/**
 * wrapper around shimContracts that just returns
 * the result in a one-element array (keeping the old name
 * shimArtifacts for compatibility)
 */
export function shimArtifacts(
  artifacts: (Artifact | Common.CompiledContract)[],
  files?: string[],
  shimmedCompilationId = "shimmedcompilation"
): Compilation[] {
  return [shimContracts(artifacts, { files, shimmedCompilationId })];
}

interface CompilationOptions {
  files?: string[];
  sources?: Common.Source[];
  shimmedCompilationId?: string;
  compiler?: Compiler.CompilerVersion;
}

/**
 * shims a bunch of contracts ("artifacts", though not necessarily)
 * to a compilation.  usually used via one of the above functions.
 * Note: if you pass in options.sources, options.files will be ignored.
 * Note: if you pass in options.sources, sources will not have
 * compiler set unless you also pass in options.compiler; in this case
 * you should set that up separately, as in shimCompilation().
 */
function shimContracts(
  artifacts: (Artifact | Common.CompiledContract)[],
  options: CompilationOptions = {}
): Compilation {
  if (artifacts.length > 0 && artifacts[0].architecture === "evm") {
    // TODO BGC TEMPORARY HACK
    debug("evm compilation");
    return shimEvmContracts(artifacts as any, options);
  } else {
    debug("Non-evm compilation", artifacts);
    return null;
  }
}

export function getContractNode(
  contract: Contract,
  compilation: Compilation
): Ast.AstNode {
  const {
    contractName,
    sourceMap,
    deployedSourceMap,
    primarySourceId
  } = contract;
  const { unreliableSourceOrder, sources } = compilation;

  let sourcesToCheck: Source[];

  //we will attempt to locate the primary source;
  //if we can't find it, we'll just check every source in this
  //compilation.
  if (primarySourceId !== undefined) {
    sourcesToCheck = [
      sources.find(source => source && source.id === primarySourceId)
    ];
  } else if (!unreliableSourceOrder && (deployedSourceMap || sourceMap)) {
    const sourceMapString = simpleShimSourceMap(deployedSourceMap || sourceMap);
    let sourceId = extractPrimarySource(sourceMapString);
    sourcesToCheck = [sources[sourceId]];
  } else {
    //WARNING: if we end up in this case, we could get the wrong contract!
    //(but we shouldn't end up here)
    sourcesToCheck = sources;
  }

  return sourcesToCheck.reduce((foundNode: Ast.AstNode, source: Source) => {
    if (foundNode || !source) {
      return foundNode;
    }
    if (!source.ast || source.language !== "Solidity") {
      //ignore non-Solidity ASTs for now, we don't support them yet
      return undefined;
    }
    return source.ast.nodes.find(
      node =>
        node.nodeType === "ContractDefinition" && node.name === contractName
    );
  }, undefined);
}

/**
 * extract the primary source from a source map
 * (i.e., the source for the first instruction, found
 * between the second and third colons)
 */
function extractPrimarySource(sourceMap: string | undefined): number {
  if (!sourceMap) {
    //HACK?
    return 0; //in this case (e.g. a Vyper contract with an old-style
    //source map) we infer that it was compiled by itself
  }
  return parseInt(sourceMap.match(/^[^:]+:[^:]+:([^:]+):/)[1]);
}

/**
 * convert Vyper source maps to solidity ones
 * (note we won't bother handling the case where the compressed
 * version doesn't exist; that will have to wait for a later version)
 */
export function simpleShimSourceMap(
  sourceMap: string | VyperSourceMap
): string {
  if (sourceMap === undefined) {
    return undefined; //undefined case
  } else if (typeof sourceMap === "object") {
    return sourceMap.pc_pos_map_compressed; //Vyper object case
  } else {
    try {
      return JSON.parse(sourceMap).pc_pos_map_compressed; //Vyper JSON case
    } catch (_) {
      return sourceMap; //Solidity case
    }
  }
}
