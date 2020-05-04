import debugModule from "debug";
const debug = debugModule("codec:compilations:utils");

import * as Ast from "@truffle/codec/ast";
import * as Compiler from "@truffle/codec/compiler";
import { ContractObject as Artifact } from "@truffle/contract-schema/spec";
import { Compilation, Contract, Source } from "./types";

export function shimArtifacts(
  artifacts: Artifact[],
  files?: string[]
): Compilation[] {
  //note: always returns a one-element array (a single fictional compilation)
  let contracts: Contract[] = [];
  let sources: Source[] = [];
  let unreliableSourceOrder: boolean = false;

  for (let artifact of artifacts) {
    let {
      contractName,
      contract_name,
      bytecode,
      sourceMap,
      deployedBytecode,
      deployedSourceMap,
      immutableReferences,
      sourcePath,
      source,
      ast,
      abi,
      compiler
    } = artifact;

    contractName = contractName || <string>contract_name;
    //dunno what's up w/ the type of contract_name, but it needs coercing

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
      let index = files.indexOf(sourcePath);
      sources[index] = sourceObject;
      sourceObject.id = index.toString(); //HACK
      contractObject.primarySourceId = index.toString();
      //note: we never set the unreliableSourceOrder flag in this branch;
      //we just trust files.  If files is bad, then, uh, too bad.
    } else {
      //if files *wasn't* passed, attempt to determine it from the ast
      //first: is this already there? only add it if it's not.
      //(we determine this by sourcePath if present, and the actual source
      //contents if not)
      if (
        sources.every(
          existingSource =>
            existingSource.sourcePath !== sourcePath ||
            (!sourcePath &&
              !existingSource.sourcePath &&
              existingSource.source !== source)
        )
      ) {
        let index = sourceIndexForAst(sourceObject.ast); //sourceObject.ast for typing reasons
        if (
          !unreliableSourceOrder &&
          index !== undefined &&
          !(index in sources)
        ) {
          sources[index] = sourceObject;
          sourceObject.id = index.toString(); //HACK
          contractObject.primarySourceId = index.toString();
        } else {
          //if we fail, set the unreliable source order flag
          unreliableSourceOrder = true;
        }
        if (unreliableSourceOrder) {
          //in case of unreliable source order, we'll ignore what indices
          //things are *supposed* to have and just append things to the end
          sourceObject.id = sources.length.toString(); //HACK
          contractObject.primarySourceId = sources.length.toString();
          sources.push(sourceObject); //these lines don't commute, obviously!
        }
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
      id: "shimmedcompilation",
      unreliableSourceOrder,
      sources,
      contracts,
      compiler
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
    if (!source.ast) {
      return undefined;
    }
    return source.ast.nodes.find(
      node =>
        node.nodeType === "ContractDefinition" && node.name === contractName
    );
  }, undefined);
}

/*
 * extract the primary source from a source map
 * (i.e., the source for the first instruction, found
 * between the second and third colons)
 * (this is something of a HACK)
 * NOTE: duplicated from debugger, sorry
 */
function extractPrimarySource(sourceMap: string): number {
  return parseInt(sourceMap.match(/^[^:]+:[^:]+:([^:]+):/)[1]);
}
