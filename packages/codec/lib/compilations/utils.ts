import debugModule from "debug";
const debug = debugModule("codec:compilations:utils");

import * as Ast from "@truffle/codec/ast";
import * as Compiler from "@truffle/codec/compiler";
import { ContractObject as Artifact } from "@truffle/contract-schema/spec";
import { CompiledContract } from "@truffle/compile-common";
import { Compilation, Contract, Source } from "./types";

export function shimArtifacts(
  artifacts: (Artifact | CompiledContract)[],
  files?: string[],
  shimmedCompilationId = "shimmedcompilation",
  externalSolidity = false
): Compilation[] {
  //note: always returns a one-element array (a single fictional compilation)
  let contracts: Contract[] = [];
  let sources: Source[] = [];
  let unreliableSourceOrder: boolean = false;

  for (let artifact of artifacts) {
    let {
      contractName,
      bytecode,
      sourceMap,
      deployedBytecode,
      deployedSourceMap,
      immutableReferences,
      sourcePath,
      source,
      ast,
      abi,
      compiler,
      generatedSources,
      deployedGeneratedSources
    } = artifact;

    if ((<Artifact>artifact).contract_name) {
      //just in case
      contractName = <string>(<Artifact>artifact).contract_name;
      //dunno what's up w/ the type of contract_name, but it needs coercing
    }

    debug("contractName: %s", contractName);

    let sourceObject: Source = {
      sourcePath,
      source,
      ast: <Ast.AstNode>ast,
      compiler
    };
    //ast needs to be coerced because schema doesn't quite match our types here...

    let contractObject: Contract = {
      contractName,
      bytecode,
      sourceMap,
      deployedBytecode,
      deployedSourceMap,
      immutableReferences,
      abi,
      compiler
    };

    //if files was passed, trust that to determine the source index
    if (files) {
      const index = files.indexOf(sourcePath);
      debug("sourcePath: %s", sourceObject.sourcePath);
      debug("given index: %d", index);
      debug(
        "sources: %o",
        sources.map(source => source.sourcePath)
      );
      sources[index] = sourceObject;
      sourceObject.id = index.toString(); //HACK
      contractObject.primarySourceId = index.toString();
      //note: we never set the unreliableSourceOrder flag in this branch;
      //we just trust files.  If files is bad, then, uh, too bad.
    } else {
      //if files *wasn't* passed, attempt to determine it from the ast
      let index = sourceIndexForAst(sourceObject.ast); //sourceObject.ast for typing reasons
      ({ index, unreliableSourceOrder } = getIndexToAddAt(
        sourceObject,
        index,
        sources,
        unreliableSourceOrder
      ));
      if (index !== null) {
        sources[index] = {
          ...sourceObject,
          id: index.toString()
        };
        contractObject.primarySourceId = index.toString();
      }
    }

    //now: add internal sources
    for (let { ast, contents, id: index, name } of [
      ...(generatedSources || []),
      ...(deployedGeneratedSources || [])
    ]) {
      const generatedSourceObject = {
        sourcePath: name,
        source: contents,
        ast: <Ast.AstNode>ast,
        compiler, //gotten from above
        internal: true
      };
      ({ index, unreliableSourceOrder } = getIndexToAddAt(
        generatedSourceObject,
        index,
        sources,
        unreliableSourceOrder
      ));
      if (index !== null) {
        sources[index] = {
          ...generatedSourceObject,
          id: index.toString()
        };
      }
    }

    contracts.push(contractObject);
  }

  let compiler: Compiler.CompilerVersion;
  if (!unreliableSourceOrder && contracts.length > 0) {
    //if things were actually compiled together, we should just be able
    //to pick an arbitrary one
    compiler = contracts[0].compiler;
  }

  return [
    {
      id: shimmedCompilationId,
      unreliableSourceOrder,
      sources,
      contracts,
      compiler,
      externalSolidity
    }
  ];
}

function sourceIndexForAst(ast: Ast.AstNode): number | undefined {
  if (!ast) {
    return undefined;
  }
  return parseInt(ast.src.split(":")[2]);
  //src is given as start:length:file.
  //we want just the file.
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
    let sourceId = extractPrimarySource(deployedSourceMap || sourceMap);
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
    if (!source.ast || source.ast.nodeType !== "SourceUnit") {
      //don't search Yul sources!
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
 * (this is something of a HACK)
 * NOTE: duplicated from debugger, sorry
 */
function extractPrimarySource(sourceMap: string): number {
  return parseInt(sourceMap.match(/^[^:]+:[^:]+:([^:]+):/)[1]);
}

function getIndexToAddAt(
  sourceObject: Source,
  index: number,
  sources: Source[],
  unreliableSourceOrder: boolean
): { index: number | null; unreliableSourceOrder: boolean } {
  //first: is this already there? only add it if it's not.
  //(we determine this by sourcePath if present, and the actual source
  //contents if not)
  debug("sourcePath: %s", sourceObject.sourcePath);
  debug("given index: %d", index);
  debug(
    "sources: %o",
    sources.map(source => source.sourcePath)
  );
  if (
    sources.every(
      existingSource =>
        existingSource.sourcePath !== sourceObject.sourcePath ||
        ((!sourceObject.sourcePath || sourceObject.internal) &&
          (!existingSource.sourcePath || existingSource.internal) &&
          existingSource.source !== sourceObject.source)
    )
  ) {
    if (unreliableSourceOrder || index === undefined || index in sources) {
      //if we can't add it at the correct spot, set the
      //unreliable source order flag
      debug("collision!");
      unreliableSourceOrder = true;
    }
    //otherwise, just leave things alone
    if (unreliableSourceOrder) {
      //in case of unreliable source order, we'll ignore what indices
      //things are *supposed* to have and just append things to the end
      index = sources.length;
    }
    return {
      index,
      unreliableSourceOrder
    };
  } else {
    //return index: null indicates don't add this because it's
    //already present
    debug("already present, not adding");
    return {
      index: null,
      unreliableSourceOrder
    };
  }
}
