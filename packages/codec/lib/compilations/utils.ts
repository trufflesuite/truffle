import debugModule from "debug";
const debug = debugModule("codec:compilations:utils");

import type { AstNode, AstNodes } from "@truffle/codec/ast/types";
import * as Ast from "@truffle/codec/ast";
import type * as Compiler from "@truffle/codec/compiler";
import type {
  ContractObject as Artifact,
  GeneratedSources
} from "@truffle/contract-schema/spec";
import type * as Common from "@truffle/compile-common";
import { Shims } from "@truffle/compile-common";
import * as Format from "@truffle/codec/format";
import type {
  Compilation,
  Contract,
  Source,
  VyperSourceMap,
  ProjectInfo,
  ProjectInfoCompilations,
  ProjectInfoCommon,
  ProjectInfoArtifacts
} from "./types";
import { NoProjectInfoError } from "../errors";

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

interface CompilationAndContract {
  compilation: Compilation;
  contract: Contract;
}

/**
 * shims a bunch of contracts ("artifacts", though not necessarily)
 * to a compilation.  usually used via one of the above functions.
 * Note: if you pass in options.sources, options.files will be ignored.
 * Note: if you pass in options.sources, sources will not have
 * compiler set unless you also pass in options.compiler; in this case
 * you should set that up separately, as in shimCompilation().
 */
export function shimContracts(
  artifacts: (Artifact | Common.CompiledContract)[],
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
      ast: <AstNode>ast,
      compiler,
      language: inferLanguage(<AstNode>ast, compiler, sourcePath)
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
        const sourceMapString = simpleShimSourceMap(
          deployedSourceMap || sourceMap
        );
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
        ast: <AstNode>ast,
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
function sourceIndexForAst(ast: AstNode): number | undefined {
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

export function getContractNode(
  contract: Contract,
  compilation: Compilation
): AstNode {
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

  return sourcesToCheck.reduce((foundNode: AstNode, source: Source) => {
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
  return parseInt(sourceMap.match(/^[^:]*:[^:]*:([^:]*):/)[1] || "0");
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
      ast: <AstNode>source.ast,
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
  ast: AstNode | undefined,
  compiler: Compiler.CompilerVersion,
  sourcePath: string
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
      //assuming sources compiled with solc without sourcePath are Solidity
      if (sourcePath && sourcePath.endsWith(".yul")) {
        return "Yul";
      } else {
        return "Solidity";
      }
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

/**
 * collects user defined types & tagged outputs for a given set of compilations,
 * returning both the definition nodes and (for the types) the type objects
 *
 * "Tagged outputs" means user-defined things that are output by a contract
 * (not input to a contract), and which are distinguished by (potentially
 * ambiguous) selectors.  So, events and custom errors are tagged outputs.
 * Function arguments are not tagged outputs (they're not outputs).
 * Return values are not tagged outputs (they don't have a selector).
 * Built-in errors (Error(string) and Panic(uint))... OK I guess those could
 * be considered tagged outputs, but we're only looking at user-defined ones
 * here.
 */
export function collectUserDefinedTypesAndTaggedOutputs(
  compilations: Compilation[]
): {
  definitions: { [compilationId: string]: AstNodes };
  typesByCompilation: Format.Types.TypesByCompilationAndId;
  types: Format.Types.TypesById;
} {
  let references: { [compilationId: string]: AstNodes } = {};
  let types: Format.Types.TypesByCompilationAndId = {};
  for (const compilation of compilations) {
    references[compilation.id] = {};
    types[compilation.id] = {
      compiler: compilation.compiler,
      types: {}
    };
    for (const source of compilation.sources) {
      if (!source) {
        continue; //remember, sources could be empty if shimmed!
      }
      const { ast, compiler, language } = source;
      if (language === "Solidity" && ast) {
        //don't check Yul or Vyper sources!
        for (const node of ast.nodes) {
          if (
            node.nodeType === "StructDefinition" ||
            node.nodeType === "EnumDefinition" ||
            node.nodeType === "UserDefinedValueTypeDefinition" ||
            node.nodeType === "ContractDefinition"
          ) {
            references[compilation.id][node.id] = node;
            //we don't have all the references yet, but we actually don't need them :)
            const dataType = Ast.Import.definitionToStoredType(
              node,
              compilation.id,
              compiler,
              references[compilation.id]
            );
            types[compilation.id].types[dataType.id] = dataType;
          } else if (
            node.nodeType === "EventDefinition" ||
            node.nodeType === "ErrorDefinition"
          ) {
            references[compilation.id][node.id] = node;
          }
          if (node.nodeType === "ContractDefinition") {
            for (const subNode of node.nodes) {
              if (
                subNode.nodeType === "StructDefinition" ||
                subNode.nodeType === "EnumDefinition" ||
                subNode.nodeType === "UserDefinedValueTypeDefinition"
              ) {
                references[compilation.id][subNode.id] = subNode;
                //we don't have all the references yet, but we only need the
                //reference to the defining contract, which we just added above!
                const dataType = Ast.Import.definitionToStoredType(
                  subNode,
                  compilation.id,
                  compiler,
                  references[compilation.id]
                );
                types[compilation.id].types[dataType.id] = dataType;
              } else if (
                subNode.nodeType === "EventDefinition" ||
                subNode.nodeType === "ErrorDefinition"
              ) {
                  references[compilation.id][subNode.id] = subNode;
              }
            }
          }
        }
      }
    }
  }
  return {
    definitions: references,
    typesByCompilation: types,
    types: Format.Types.forgetCompilations(types)
  };
}

/**
 * Given a list of compilations, and an artifact appearing in one
 * of those compilations, finds the compilation and the corresponding
 * contract object
 * (these may be undefined if they can't be found)
 */
export function findCompilationAndContract(
  compilations: Compilation[],
  artifact: Artifact
): CompilationAndContract {
  const deployedBytecode = Shims.NewToLegacy.forBytecode(
    artifact.deployedBytecode
  );
  const bytecode = Shims.NewToLegacy.forBytecode(artifact.bytecode);

  let firstNameMatch: CompilationAndContract;
  let multipleNameMatches: boolean = false;
  for (const compilation of compilations) {
    for (const contract of compilation.contracts) {
      const nameMatches =
        contract.contractName === (artifact.contractName || <string>artifact.contract_name);
      if (nameMatches) {
        if (bytecode) {
          if (Shims.NewToLegacy.forBytecode(contract.bytecode) === bytecode) {
            return { compilation, contract };
          }
        } else if (deployedBytecode) {
          if (Shims.NewToLegacy.forBytecode(contract.deployedBytecode) === deployedBytecode) {
            return { compilation, contract };
          }
        } else if (!firstNameMatch) {
          //if we have a name match, but no bytecode to go by, record this one.
          //if it turns out to be the only one, we'll return it later.
          firstNameMatch = { compilation, contract };
        } else if (!multipleNameMatches) {
          //on the other hand, if there *is* an existing name match already,
          //record that we've got multiple.
          multipleNameMatches = true;
        }
      }
    }
  }
  //once the loop is done, if we haven't returned a bytecode match,
  //check if we've got a unique name match, and return it if so
  if (firstNameMatch && !multipleNameMatches) {
    return firstNameMatch;
  }
  //otherwise, if there's no bytecode match, and either no name match
  //or multiple name matches, just return a default fallback
  const defaultContract = {
    contractName: artifact.contractName || <string>artifact.contract_name,
    abi: artifact.abi
  };
  const defaultCompilation = {
    id: "defaultCompilation",
    sources: [] as Source[],
    contracts: [defaultContract]
  };
  return {
    compilation: defaultCompilation,
    contract: defaultContract
  }
}

function projectInfoIsCodecStyle(
  info: ProjectInfo
): info is ProjectInfoCompilations {
  return Boolean((<ProjectInfoCompilations>info).compilations);
}

function projectInfoIsCommonStyle(
  info: ProjectInfo
): info is ProjectInfoCommon {
  return Boolean((<ProjectInfoCommon>info).commonCompilations);
}

function projectInfoIsArtifacts(
  info: ProjectInfo
): info is ProjectInfoArtifacts {
  return Boolean((<ProjectInfoArtifacts>info).artifacts);
}

export function infoToCompilations(
  projectInfo: ProjectInfo | undefined
): Compilation[] {
  if (!projectInfo) {
    throw new NoProjectInfoError();
  }
  if (projectInfoIsCodecStyle(projectInfo)) {
    return projectInfo.compilations;
  } else if (projectInfoIsCommonStyle(projectInfo)) {
    return shimCompilations(projectInfo.commonCompilations);
  } else if (projectInfoIsArtifacts(projectInfo)) {
    return shimArtifacts(projectInfo.artifacts);
  }
}
