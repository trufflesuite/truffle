import debugModule from "debug";
const debug = debugModule("codec:compilations:utils");

import * as Ast from "@truffle/codec/ast";
import * as Compiler from "@truffle/codec/compiler";
import {
  ContractObject as Artifact,
  GeneratedSources
} from "@truffle/contract-schema/spec";
import * as Common from "@truffle/compile-common";
import {Compilation, Contract, Source} from "./types";

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

export function shimCompilation(
  inputCompilation: Common.Compilation,
  shimmedCompilationId = "shimmedcompilation"
): Compilation {
  return {
    ...shimContracts(inputCompilation.contracts, {
      files: inputCompilation.sourceIndexes,
      sources: inputCompilation.sources,
      shimmedCompilationId
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
  return [shimContracts(artifacts, {files, shimmedCompilationId})];
}

interface CompilationOptions {
  files?: string[];
  sources?: Common.Source[];
  shimmedCompilationId?: string;
}

/**
 * shims a bunch of contracts ("artifacts", though not necessarily)
 * to a compilation.  usually used via one of the above functions.
 * Note: if you pass in options.sources, options.files will be ignored.
 * Note: if you pass in options.sources, sources will not have
 * compiler set, so you should set that up separately, as in
 * shimCompilation().
 */
export function shimContracts(
  artifacts: (Artifact | Common.CompiledContract)[],
  options: CompilationOptions = {}
): Compilation {
  const {files, sources: inputSources} = options;
  const shimmedCompilationId =
    options.shimmedCompilationId || "shimmedcompilation";
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

    let contractObject: Contract = {
      contractName,
      bytecode,
      sourceMap,
      deployedBytecode,
      deployedSourceMap,
      immutableReferences,
      abi,
      generatedSources: normalizeGeneratedSources(generatedSources, compiler),
      deployedGeneratedSources: normalizeGeneratedSources(
        deployedGeneratedSources,
        compiler
      ),
      compiler
    };

    let sourceObject: Source = {
      sourcePath,
      source,
      ast: <Ast.AstNode>ast,
      compiler,
      language: inferLanguage(<Ast.AstNode>ast)
    };
    //ast needs to be coerced because schema doesn't quite match our types here...

    //if files or sources was passed, trust that to determine the source index
    if (files || inputSources) {
      //note: we never set the unreliableSourceOrder flag in this branch;
      //we just trust files/sources.  If this info is bad, then, uh, too bad.
      const index = inputSources
        ? inputSources.findIndex(source => source.sourcePath === sourcePath)
        : files.indexOf(sourcePath);
      if (!inputSources) {
        //if inputSources was passed, we'll handle this separately below
        sources[index] = sourceObject;
      }
      sourceObject.id = index.toString(); //HACK
      contractObject.primarySourceId = index.toString();
    } else {
      //if neither was passed, attempt to determine it from the ast
      let index = sourceIndexForAst(sourceObject.ast); //sourceObject.ast for typing reasons
      ({index, unreliableSourceOrder} = getIndexToAddAt(
        sourceObject,
        index,
        sources,
        unreliableSourceOrder
      ));
      if (index !== null) {
        //if we're in this case, inputSources was not passed
        sources[index] = {
          ...sourceObject,
          id: index.toString()
        };
        contractObject.primarySourceId = index.toString();
      }
    }

    contracts.push(contractObject);
  }

  if (inputSources) {
    //if input sources was passed, set up the sources object directly :)
    sources = inputSources.map(
      ({sourcePath, contents: source, ast, language}) => ({
        sourcePath,
        source,
        ast: <Ast.AstNode>ast,
        language
        //we'll omit compiler, as if inputSources was passed, presumably
        //we're using shimCompilation(), which sets that up separately
      })
    );
  }

  //now: check for id overlap with internal sources
  //(don't bother if inputSources or files was passed)
  if (!inputSources && !files) {
    for (let contract of contracts) {
      const {generatedSources, deployedGeneratedSources} = contract;
      for (let index in generatedSources) {
        if (index in sources) {
          unreliableSourceOrder = true;
        }
      }
      for (let index in deployedGeneratedSources) {
        if (index in sources) {
          unreliableSourceOrder = true;
        }
      }
    }
  }

  let compiler: Compiler.CompilerVersion;
  if (!unreliableSourceOrder && contracts.length > 0) {
    //if things were actually compiled together, we should just be able
    //to pick an arbitrary one
    compiler = contracts[0].compiler;
  }

  return {
    id: shimmedCompilationId,
    unreliableSourceOrder,
    sources,
    contracts,
    compiler
  };
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
  const {unreliableSourceOrder, sources} = compilation;

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
    if (!source.ast || source.language !== "solidity") {
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

function normalizeGeneratedSources(
  generatedSources: Source[] | GeneratedSources,
  compiler: Compiler.CompilerVersion
): Source[] {
  if (!generatedSources) {
    return [];
  }
  if (!isGeneratedSources(generatedSources)) {
    return generatedSources; //if already normalizeed, leave alone
  }
  let sources = []; //output
  for (let source of generatedSources) {
    sources[source.id] = {
      id: source.id.toString(), //Nick says this is fine :P
      sourcePath: source.name,
      source: source.contents,
      //ast needs to be coerced because schema doesn't quite match our types here...
      ast: <Ast.AstNode>source.ast,
      compiler: compiler,
      language: source.language
    };
  }
  return sources;
}

//HACK
function isGeneratedSources(
  sources: Source[] | GeneratedSources
): sources is GeneratedSources {
  //note: for some reason arr.includes(undefined) returns true on sparse arrays
  //if sources.length === 0, it's ambiguous; we'll exclude it as not needing normalization
  return (
    sources.length > 0 &&
    !sources.includes(undefined) &&
    ((<GeneratedSources>sources)[0].contents !== undefined ||
      (<GeneratedSources>sources)[0].name !== undefined)
  );
}

//HACK, maybe?
function inferLanguage(ast: Ast.AstNode | undefined): string | undefined {
  if (!ast || typeof ast.nodeType !== "string") {
    return undefined;
  } else if (ast.nodeType === "SourceUnit") {
    return "solidity";
  } else if (ast.nodeType.startsWith("Yul")) {
    //Every Yul source I've seen has YulBlock as the root, but
    //I'm not sure that that's *always* the case
    return "yul";
  } else {
    return undefined;
  }
}

function getIndexToAddAt(
  sourceObject: Source,
  index: number,
  sources: Source[],
  unreliableSourceOrder: boolean
): {index: number | null; unreliableSourceOrder: boolean} {
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
        (!sourceObject.sourcePath &&
          !existingSource.sourcePath &&
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
