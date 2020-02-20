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
      abi,
      compiler
    };

    //if files was passed, trust that to determine the source index
    if (files) {
      let index = files.indexOf(sourcePath);
      sources[index] = sourceObject;
      contractObject.primarySourceIndex = index;
      //note: we never set the unreliableSourceOrder flag in this branch;
      //we just trust files.  If files is bad, then, uh, too bad.
    } else {
      //if files *wasn't* passed, attempt to determine it from the ast
      //first: is this already there? only add it if it's not.
      if (
        sources.every(
          existingSource => existingSource.sourcePath !== sourcePath
        )
      ) {
        let index = sourceIndexForAst(sourceObject.ast); //sourceObject.ast for typing reasons
        if (
          !unreliableSourceOrder &&
          index !== undefined &&
          !(index in sources)
        ) {
          sources[index] = sourceObject;
          contractObject.primarySourceIndex = index;
        } else {
          //if we fail, set the unreliable source order flag
          unreliableSourceOrder = true;
        }
        if (unreliableSourceOrder) {
          //in case of unreliable source order, we'll ignore what indices
          //things are *supposed* to have and just append things to the end
          contractObject.primarySourceIndex = sources.length;
          sources.push(sourceObject); //these two lines don't commute, obviously!
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
