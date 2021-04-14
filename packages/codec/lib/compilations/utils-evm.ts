import debugModule from "debug";
const debug = debugModule("codec:compilations:utils");

import * as Ast from "@truffle/codec/ast";
import * as Compiler from "@truffle/codec/compiler";
import {
  ContractObject as Artifact,
  GeneratedSources
} from "@truffle/contract-schema/spec";
import * as Common from "@truffle/compile-common";
import { Compilation, Contract, Source } from "./types";
import { simpleShimSourceMap } from "./utils";

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
export function shimEvmContracts(
  artifacts: (Artifact | Common.EvmCompiledContract)[],
  options: CompilationOptions = {}
): Compilation {
  const { files, sources: inputSources } = options;
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
      language: inferLanguage(<Ast.AstNode>ast, compiler)
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
        sourceObject.id = index.toString(); //HACK
        sources[index] = sourceObject;
      }
      contractObject.primarySourceId = index.toString(); //HACK
    } else {
      //if neither was passed, attempt to determine it from the ast
      let index;
      if (sourceObject.ast) {
        //note: this works for both Solidity and Vyper
        index = sourceIndexForAst(sourceObject.ast); //sourceObject.ast for typing reasons
      } else if (compiler && compiler.name === "vyper") {
        index = 0; //if it's Vyper but there's no AST, we can
        //assume that it was compiled alone and therefore has index 0
      }
      //if that didn't work, try the source map
      if (index === undefined && (sourceMap || deployedSourceMap)) {
        const sourceMapString = simpleShimSourceMap(deployedSourceMap || sourceMap);
        index = extractPrimarySource(sourceMapString);
      }
      //else leave undefined for now
      ({ index, unreliableSourceOrder } = getIndexToAddAt(
        sourceObject,
        index,
        sources,
        unreliableSourceOrder
      ));
      if (index !== null) {
        //if we're in this case, inputSources was not passed
        sourceObject.id = index.toString(); //HACK
        sources[index] = sourceObject;
        contractObject.primarySourceId = index.toString();
      }
    }

    contracts.push(contractObject);
  }

  //now: check for id overlap with internal sources
  //(don't bother if inputSources or files was passed)
  if (!inputSources && !files) {
    for (let contract of contracts) {
      const { generatedSources, deployedGeneratedSources } = contract;
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
  if (options.compiler) {
    compiler = options.compiler;
  } else if (!unreliableSourceOrder && contracts.length > 0) {
    //if things were actually compiled together, we should just be able
    //to pick an arbitrary one
    compiler = contracts[0].compiler;
  }

  //if input sources was passed, set up the sources object directly :)
  if (inputSources) {
    sources = inputSources.map(
      ({ sourcePath, contents: source, ast, language }, index) => ({
        sourcePath,
        source,
        ast: <Ast.AstNode>ast,
        language,
        id: index.toString(), //HACK
        compiler //redundant but let's include it
      })
    );
  }

  return {
    id: shimmedCompilationId,
    unreliableSourceOrder,
    sources,
    contracts,
    compiler
  };
}

//note: this works for Vyper too!
function sourceIndexForAst(ast: Ast.AstNode): number | undefined {
  if (Array.isArray(ast)) {
    //special handling for old Vyper versions
    ast = ast[0];
  }
  if (!ast) {
    return undefined;
  }
  return parseInt(ast.src.split(":")[2]);
  //src is given as start:length:file.
  //we want just the file.
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
function inferLanguage(
  ast: Ast.AstNode | undefined,
  compiler: Compiler.CompilerVersion
): string | undefined {
  if (ast) {
    if (ast.nodeType === "SourceUnit") {
      return "Solidity";
    } else if (ast.nodeType && ast.nodeType.startsWith("Yul")) {
      //Every Yul source I've seen has YulBlock as the root, but
      //I'm not sure that that's *always* the case
      return "Yul";
    } else if (Array.isArray(ast) || ast.ast_type === "Module") {
      return "Vyper";
    }
  } else if (compiler) {
    if (compiler.name === "vyper") {
      return "Vyper";
    } else if (compiler.name === "solc") {
      //if it's solc but no AST, just assume it's Solidity
      return "Solidity";
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }
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
