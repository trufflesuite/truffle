import debugModule from "debug";
const debug = debugModule("debugger:data:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";
import jsonpointer from "json-pointer";
import merge from "lodash/merge";
import semver from "semver";

import { stableKeccak256, makePath } from "lib/helpers";

import trace from "lib/trace/selectors";
import evm from "lib/evm/selectors";
import sourcemapping from "lib/sourcemapping/selectors";
import stacktrace from "lib/stacktrace/selectors";

import * as Codec from "@truffle/codec";

/**
 * @private
 */
const identity = x => x;

function solidityVersionHasNoNow(compiler) {
  return (
    compiler &&
    compiler.name === "solc" &&
    //want to include prerelease versions of 0.7.0
    semver.satisfies(compiler.version, "~0.7 || >=0.7.0", {
      includePrerelease: true
    })
  );
}

function findAncestorOfType(node, types, scopes, pointer = null, root = null) {
  //note: you may want to include "SourceUnit" as a fallback type when using
  //this function for convenience.
  //you only need to pass pointer and root if you want this function to work
  //from Yul.  Otherwise you can omit those and you'll get null if you happen
  //to be in Yul.
  while (node && !types.includes(node.nodeType)) {
    if (node.id !== undefined) {
      node = scopes[scopes[node.id].parentId].definition;
    } else {
      if (pointer === null || root === null || pointer === "") {
        //if we're trying to go up from the root but are still in Yul,
        //or if we weren't given pointer and root at all,
        //admit failure and return null
        return null;
      }
      pointer = pointer.replace(/\/[^/]*$/, ""); //chop off end
      node = jsonpointer.get(root, pointer);
    }
  }
  return node;
}

//given a modifier invocation (or inheritance specifier) node,
//get the node for the actual modifier (or constructor)
function modifierForInvocation(invocation, scopes) {
  let rawId; //raw referencedDeclaration ID extracted from the AST.
  //if it's a modifier this is what we want, but if it's base
  //constructor, we'll get the contract instead, and need to find its
  //constructor.
  switch (invocation.nodeType) {
    case "ModifierInvocation":
      rawId = invocation.modifierName.referencedDeclaration;
      break;
    case "InheritanceSpecifier":
      rawId = invocation.baseName.referencedDeclaration;
      break;
    default:
      debug("bad invocation node");
  }
  let rawNode = scopes[rawId].definition;
  switch (rawNode.nodeType) {
    case "ModifierDefinition":
      return rawNode;
    case "ContractDefinition":
      return rawNode.nodes.find(
        node =>
          node.nodeType === "FunctionDefinition" &&
          Codec.Ast.Utils.functionKind(node) === "constructor"
      );
    default:
      //we should never hit this case
      return undefined;
  }
}

//see data.views.contexts for an explanation
function debuggerContextToDecoderContext(context) {
  let {
    context: contextHash,
    contractName,
    binary,
    contractId,
    contractKind,
    isConstructor,
    abi,
    payable,
    compiler,
    compilationId
  } = context;
  return {
    context: contextHash,
    contractName,
    binary,
    contractId,
    contractKind,
    isConstructor,
    abi: Codec.AbiData.Utils.computeSelectors(abi),
    fallbackAbi: {
      fallback: (abi || []).find(item => item.type === "fallback") || null,
      receive: (abi || []).find(item => item.type === "receive") || null
    },
    payable,
    compiler,
    compilationId
  };
}

//spoofed definitions we'll need
//we'll give them id -1 to indicate that they're spoofed

export const NOW_DEFINITION = {
  id: -1,
  src: "0:0:-1",
  name: "now",
  nodeType: "VariableDeclaration",
  typeDescriptions: {
    typeIdentifier: "t_uint256",
    typeString: "uint256"
  }
};

export const MSG_DEFINITION = {
  id: -1,
  src: "0:0:-1",
  name: "msg",
  nodeType: "VariableDeclaration",
  typeDescriptions: {
    typeIdentifier: "t_magic_message",
    typeString: "msg"
  }
};

export const TX_DEFINITION = {
  id: -1,
  src: "0:0:-1",
  name: "tx",
  nodeType: "VariableDeclaration",
  typeDescriptions: {
    typeIdentifier: "t_magic_transaction",
    typeString: "tx"
  }
};

export const BLOCK_DEFINITION = {
  id: -1,
  src: "0:0:-1",
  name: "block",
  nodeType: "VariableDeclaration",
  typeDescriptions: {
    typeIdentifier: "t_magic_block",
    typeString: "block"
  }
};

function spoofThisDefinition(contractName, contractId, contractKind) {
  let formattedName = contractName.replace(/\$/g, "$$".repeat(3));
  //note that string.replace treats $'s specially in the replacement string;
  //we want 3 $'s for each $ in the input, so we need to put *6* $'s in the
  //replacement string
  return {
    id: -1,
    src: "0:0:-1",
    name: "this",
    nodeType: "VariableDeclaration",
    typeDescriptions: {
      typeIdentifier: "t_contract$_" + formattedName + "_$" + contractId,
      typeString: contractKind + " " + contractName
    }
  };
}

const data = createSelectorTree({
  state: state => state.data,

  /**
   * data.views
   */
  views: {
    /*
     * data.views.atLastInstructionForSourceRange
     */
    atLastInstructionForSourceRange: createLeaf(
      [sourcemapping.current.isSourceRangeFinal],
      final => final
    ),

    /**
     * data.views.scopes (namespace)
     */
    scopes: {
      /*
       * data.views.scopes (selector)
       * the raw scopes data, just with intermediate
       * layers cut out
       * (no inheritance, no inlining)
       */
      _: createLeaf(["/info/scopes"], scopes =>
        Object.assign(
          {},
          ...Object.entries(scopes).map(([sourceId, { byAstRef: nodes }]) => ({
            [sourceId]: nodes
          }))
        )
      ),

      /**
       * data.views.scopes.inlined
       * inlines, but still no inheritance data
       */
      inlined: createLeaf(
        ["./_", sourcemapping.views.sources],

        (scopes, sources) =>
          Object.assign(
            {},
            ...Object.entries(scopes).map(([sourceId, nodes]) => ({
              [sourceId]: Object.assign(
                {},
                ...Object.entries(nodes).map(([astRef, scope]) => ({
                  [astRef]: {
                    ...scope,
                    definition: jsonpointer.get(
                      sources[scope.sourceId].ast,
                      scope.pointer
                    )
                  }
                }))
              )
            }))
          )
      )
    },

    /**
     * data.views.userDefinedTypesByCompilation
     */
    userDefinedTypesByCompilation: createLeaf(
      [
        "/info/userDefinedTypes",
        "./referenceDeclarations",
        "./scopes/inlined",
        sourcemapping.views.sources
      ],
      (userDefinedTypes, referenceDeclarations, scopes, sources) => {
        let typesByCompilation = {};
        for (const { sourceId, id } of userDefinedTypes) {
          const node = scopes[sourceId][id].definition;
          const { compilationId, compiler, internal } = sources[sourceId];
          if (internal) {
            continue; //just to be sure, we assume generated sources don't define types
          }
          const type = Codec.Ast.Import.definitionToStoredType(
            node,
            compilationId,
            compiler,
            referenceDeclarations[compilationId]
          );
          if (!typesByCompilation[compilationId]) {
            typesByCompilation[compilationId] = {
              compiler,
              types: {}
            };
          }
          typesByCompilation[compilationId].types[type.id] = type;
        }
        return typesByCompilation;
      }
    ),

    /**
     * data.views.userDefinedTypes
     * user-defined types for passing to the decoder
     * NOTE: *not* grouped by compilation or anything, this is flat
     */
    userDefinedTypes: createLeaf(
      ["./userDefinedTypesByCompilation"],
      Codec.Format.Types.forgetCompilations
    ),

    /**
     * data.views.contractAllocationInfo
     */
    contractAllocationInfo: createLeaf(
      [
        "/info/userDefinedTypes",
        "/views/scopes/inlined",
        "/info/contracts",
        sourcemapping.views.sources,
        evm.info.contexts
      ],
      (userDefinedTypes, scopes, contracts, sources, contexts) =>
        Object.values(userDefinedTypes)
          .filter(
            ({ sourceId, id }) =>
              !sources[sourceId].internal && //again, assuming internal sources don't define contracts
              scopes[sourceId][id].definition.nodeType === "ContractDefinition"
          )
          .map(({ sourceId, id }) => {
            debug("id: %O", id);
            const compilationId = sources[sourceId].compilationId;
            debug("compilationId: %O", compilationId);
            const contract = contracts[compilationId].byAstId[id];
            const deployedContext = contexts[contract.deployedContext];
            const constructorContext = contexts[contract.constructorContext];
            const immutableReferences = (deployedContext || {})
              .immutableReferences;
            return {
              contractNode: scopes[sourceId][id].definition,
              compilationId,
              immutableReferences,
              compiler: sources[sourceId].compiler,
              abi: contract.abi,
              deployedContext,
              constructorContext
            };
          })
    ),

    /**
     * data.views.referenceDeclarations
     * grouped by compilation because that's how codec wants it;
     * for simplicity, we will assume that generated sources never define types!
     */
    referenceDeclarations: createLeaf(
      [
        "./scopes/inlined",
        "/info/userDefinedTypes",
        "/info/taggedOutputs",
        sourcemapping.views.sources
      ],
      (scopes, userDefinedTypes, taggedOutputs, sources) =>
        merge(
          {},
          ...userDefinedTypes.concat(taggedOutputs).map(({ id, sourceId }) => {
            const source = sources[sourceId];
            return source.internal
              ? {} //exclude these
              : {
                  [source.compilationId]: {
                    [id]: scopes[sourceId][id].definition
                  }
                };
          })
        )
    ),

    /**
     * data.views.mappingKeys
     */
    mappingKeys: createLeaf(
      ["/proc/mappedPaths", "/current/address"],
      (mappedPaths, address) =>
        []
          .concat(
            ...Object.values(
              (mappedPaths.byAddress[address] || { byType: {} }).byType
            ).map(({ bySlotAddress }) => Object.values(bySlotAddress))
          )
          .filter(slot => slot.key !== undefined)
    ),

    /*
     * data.views.blockNumber
     * returns block number as string
     */
    blockNumber: createLeaf([evm.transaction.globals.block], block =>
      block.number.toString()
    ),

    /*
     * data.views.instances
     * same as evm.current.codex.instances, but we just map address => binary,
     * we don't bother with context, and also the code is a Uint8Array
     */
    instances: createLeaf([evm.current.codex.instances], instances =>
      Object.assign(
        {},
        ...Object.entries(instances).map(([address, { binary }]) => ({
          [address]: Codec.Conversion.toBytes(binary)
        }))
      )
    ),

    /*
     * data.views.contexts
     * same as evm.info.contexts, but:
     * 1. we strip out fields irrelevant to codec
     * 2. we alter abi in a few ways ways:
     * 2a. we strip out everything but functions
     * 2b. abi is now an object, not an array, and indexed by these signatures
     * 2c. fallback/receive stuff instead goes in the fallbackAbi field
     */
    contexts: createLeaf([evm.info.contexts], contexts =>
      Object.assign(
        {},
        ...Object.values(contexts).map(context => ({
          [context.context]: debuggerContextToDecoderContext(context)
        }))
      )
    )
  },

  /**
   * data.info
   */
  info: {
    /**
     * data.info.scopes
     */
    scopes: createLeaf(["/state"], state => state.info.scopes.bySourceId),

    /**
     * data.info.contracts
     */
    contracts: createLeaf(
      ["/state"],
      state => state.info.contracts.byCompilationId
    ),

    /*
     * data.info.allocations
     */
    allocations: {
      /*
       * data.info.allocations.storage
       */
      storage: createLeaf(["/state"], state => state.info.allocations.storage),

      /**
       * data.info.allocations.state
       */
      state: createLeaf(["/state"], state => state.info.allocations.state),

      /*
       * data.info.allocations.memory
       */
      memory: createLeaf(["/state"], state => state.info.allocations.memory),

      /*
       * data.info.allocations.abi
       */
      abi: createLeaf(["/state"], state => state.info.allocations.abi),

      /*
       * data.info.allocations.calldata
       */
      calldata: createLeaf(
        ["/state"],
        state => state.info.allocations.calldata
      ),

      /*
       * data.info.allocations.returndata
       */
      returndata: createLeaf(
        ["/state"],
        state => state.info.allocations.returndata
      ),

      /*
       * data.info.allocations.event
       */
      event: createLeaf(["/state"], state => state.info.allocations.event)
    },

    /**
     * data.info.userDefinedTypes
     */
    userDefinedTypes: createLeaf(
      ["/state"],
      state => state.info.userDefinedTypes
    ),

    /**
     * data.info.taggedOutputs
     * "Tagged outputs" means user-defined things that are output by a contract
     * (not input to a contract), and which are distinguished by (potentially
     * ambiguous) selectors.  So, events and custom errors are tagged outputs.
     * Function arguments are not tagged outputs (they're not outputs).
     * Return values are not tagged outputs (they don't have a selector).
     * Built-in errors (Error(string) and Panic(uint))... OK I guess those could
     * be considered tagged outputs, but we're only looking at user-defined ones
     * here.
     */
    taggedOutputs: createLeaf(["/state"], state => state.info.taggedOutputs)
  },

  /**
   * data.proc
   */
  proc: {
    /**
     * data.proc.assignments
     */
    assignments: createLeaf(["/state"], state => state.proc.assignments.byId),

    /*
     * data.proc.mappedPaths
     */
    mappedPaths: createLeaf(["/state"], state => state.proc.mappedPaths)
  },

  /**
   * data.current
   */
  current: {
    /**
     * data.current.state
     */
    state: {
      /**
       * data.current.state.stack
       */
      stack: createLeaf(
        [evm.current.state.stack],

        words => (words || []).map(word => Codec.Conversion.toBytes(word))
      ),

      /**
       * data.current.state.memory
       */
      memory: createLeaf(
        [evm.current.state.memory],

        words => Codec.Conversion.toBytes(words.join(""))
      ),

      /**
       * data.current.state.code
       */
      code: createLeaf([evm.current.context], ({ binary }) =>
        Codec.Conversion.toBytes(binary)
      ),

      /**
       * data.current.state.calldata
       */
      calldata: createLeaf(
        [evm.current.call],

        ({ data }) => Codec.Conversion.toBytes(data)
      ),

      /**
       * data.current.state.eventdata
       * usually undefined; used for log decoding
       */
      eventdata: createLeaf([evm.current.step.logData], data =>
        data !== null ? Codec.Conversion.toBytes(data) : undefined
      ),

      /**
       * data.current.state.eventtopics
       * usually undefined; used for log decoding
       */
      eventtopics: createLeaf([evm.current.step.logTopics], words =>
        words !== null
          ? words.map(word => Codec.Conversion.toBytes(word))
          : undefined
      ),

      /**
       * data.current.state.storage
       */
      storage: createLeaf(
        [evm.current.codex.storage],

        mapping =>
          Object.assign(
            {},
            ...Object.entries(mapping).map(([address, word]) => ({
              [`0x${address}`]: Codec.Conversion.toBytes(word)
            }))
          )
      ),

      /*
       * data.current.state.specials
       * I've named these after the solidity variables they correspond to,
       * which are *mostly* the same as the corresponding EVM opcodes
       * (FWIW: this = ADDRESS, sender = CALLER, value = CALLVALUE)
       */
      specials: createLeaf(
        ["/current/address", evm.current.call, evm.transaction.globals],
        (address, { sender, value }, { tx, block }) => ({
          this: Codec.Conversion.toBytes(address),

          sender: Codec.Conversion.toBytes(sender),

          value: Codec.Conversion.toBytes(value),

          //let's crack open that tx and block!
          ...Object.assign(
            {},
            ...Object.entries(tx).map(([variable, value]) => ({
              [variable]: Codec.Conversion.toBytes(value)
            }))
          ),

          ...Object.assign(
            {},
            ...Object.entries(block).map(([variable, value]) => ({
              [variable]: Codec.Conversion.toBytes(value)
            }))
          )
        })
      )
    },

    /**
     * data.current.compilationId
     */
    compilationId: createLeaf(
      [evm.current.context],
      ({ compilationId }) => compilationId
    ),

    /**
     * data.current.sourceIndex
     */
    sourceIndex: createLeaf(
      [sourcemapping.current.source],
      ({ index }) => index
    ),

    /**
     * data.current.language
     */
    language: createLeaf(
      [sourcemapping.current.source],
      ({ language }) => language
    ),

    /**
     * data.current.internalSourceFor
     * returns null if in a user source
     */
    internalSourceFor: createLeaf(
      [sourcemapping.current.source],
      ({ internalFor }) => internalFor || null
    ),

    /**
     * data.current.root
     */
    root: createLeaf([sourcemapping.current.source], ({ ast }) => ast),

    /**
     * data.current.scopes (namespace)
     */
    scopes: {
      /**
       * data.current.scopes (selector)
       * Replacement for the old data.info.scopes;
       * that one now contains multi-compilation/context info, this
       * one contains only the current compilation/context
       */
      _: createLeaf(["./raw", "./inlined/raw"], (scopes, inlined) =>
        Object.assign(
          {},
          ...Object.entries(scopes).map(([id, scope]) => {
            let definition = inlined[id].definition;
            if (definition.nodeType === "ContractDefinition") {
              //contract definition case: process inheritance
              debug("contract id %d", id);
              let newScope = { ...scope };
              //note that Solidity gives us the linearization in order from most
              //derived to most base, but we want most base to most derived;
              //annoyingly, reverse() is in-place, so we clone with slice() first
              const linearizedBaseContractsFromBase =
                definition.linearizedBaseContracts.slice().reverse();
              linearizedBaseContractsFromBase.pop(); //remove the last element, i.e.,
              //the contract itself, because we want to treat that one specially
              //now, we put it all together
              newScope.variables = []
                .concat(
                  //concatenate the variables lists from the base classes
                  ...linearizedBaseContractsFromBase.map(
                    contractId => scopes[contractId].variables || []
                    //we need the || [] because contracts with no state variables
                    //have variables undefined rather than empty like you'd expect
                  )
                )
                .filter(
                  variable =>
                    inlined[variable.astRef].definition.visibility !== "private"
                  //filter out private variables from the base classes
                )
                //add in the variables for the contract itself -- note that here
                //private variables are not filtered out!
                .concat(scopes[id].variables || [])
                .filter(variable => {
                  //HACK: let's filter out those constants we don't know
                  //how to read.  they'll just clutter things up.
                  debug("variable %O", variable);
                  const definition = inlined[variable.astRef].definition;
                  return (
                    !(
                      definition.constant ||
                      definition.mutability === "constant"
                    ) || Codec.Ast.Utils.isSimpleConstant(definition.value)
                  );
                });
              return { [id]: newScope };
            } else if (definition.nodeType === "SourceUnit") {
              //source unit case: process imports
              let newScope = { ...scope };
              //in this case, handling imports in some sort of tree fashion would
              //be too much work.  we'll do this the easy way: by checking exported
              //symbols for constants.
              newScope.variables = Object.values(definition.exportedSymbols)
                .map(
                  array => array[0] //I don't know why these are arrays...?
                )
                .filter(astRef => {
                  //restrict to variables, not other exported symbols!
                  const definition = inlined[astRef].definition;
                  return (
                    definition.nodeType === "VariableDeclaration" &&
                    (definition.constant ||
                      definition.mutability === "constant") &&
                    //HACK: we'll also again filter out constants we don't know how
                    //to read
                    Codec.Ast.Utils.isSimpleConstant(definition.value)
                  );
                })
                .map(astRef => ({
                  //we'll have to reconstruct the rest from just the astRef
                  astRef,
                  name: inlined[astRef].definition.name,
                  sourceId: inlined[astRef].sourceId
                }));
              return { [id]: newScope };
            } else {
              //default case, nothing to process
              return { [id]: scope };
            }
          })
        )
      ),

      /**
       * data.current.scopes.raw
       * Current scopes, with inheritance not handled and no inlining
       */
      raw: createLeaf(
        ["/views/scopes", sourcemapping.current.sourceIds],
        (scopes, sourceIds) =>
          Object.assign({}, ...sourceIds.map(sourceId => scopes[sourceId]))
      ),

      /**
       * data.current.scopes.inlined (namespace)
       */
      inlined: {
        /**
         * data.current.scopes.inlined (selector)
         * Replacement for the old data.views.scopes.inlined;
         * that one now contains multi-compilation info, this
         * one contains only the current compilation/context
         */
        _: createLeaf(["./raw", "../_"], (inlined, scopes) =>
          Object.assign(
            {},
            ...Object.entries(inlined).map(([astRef, info]) => ({
              [astRef]: {
                ...info,
                variables: scopes[astRef].variables
              }
            }))
          )
        ),

        /**
         * data.current.scopes.inlined.raw
         * inlines definitions but does not account for inheritance
         */
        raw: createLeaf(
          ["/views/scopes/inlined", sourcemapping.current.sourceIds],
          (scopes, sourceIds) =>
            Object.assign({}, ...sourceIds.map(sourceId => scopes[sourceId]))
        )
      }
    },

    /**
     * data.current.referenceDeclarations
     */
    referenceDeclarations: createLeaf(
      ["/views/referenceDeclarations", "./compilationId"],
      (scopes, compilationId) => scopes[compilationId]
    ),

    /**
     * data.current.allocations
     */
    allocations: {
      /**
       * data.current.allocations.state
       * Same as data.info.allocations.state, but uses the old allocation
       * format (more convenient for debugger) where members are stored by ID
       * in an object instead of by index in an array; also only holds things
       * from the current compilation
       * ALSO: if we're in a constructor, replaces all code pointers by appropriate
       * memory pointers :)
       */
      state: createLeaf(
        ["/info/allocations/state", "../compilationId", evm.current.context],
        (allAllocations, compilationId, { isConstructor }) => {
          debug("compilationId: %s", compilationId);
          debug("allAllocations: %o", allAllocations);
          const allocations = compilationId
            ? allAllocations[compilationId]
            : {};
          //several-deep clone
          let transformedAllocations = Object.assign(
            {},
            ...Object.entries(allocations).map(([id, allocation]) => ({
              [id]: {
                members: allocation.members.map(member => ({ ...member }))
              }
            }))
          );
          //if we're not in a constructor, we don't need to actually transform it.
          //if we are...
          if (isConstructor) {
            //...we must transform code pointers!
            for (const id in transformedAllocations) {
              const allocation = transformedAllocations[id];
              //here, the magic number 4 is the number of reserved memory slots
              //at the start of memory.  immutables go immediately afterward.
              let start = 4 * Codec.Evm.Utils.WORD_SIZE;
              for (const member of allocation.members) {
                //if it's not a code pointer, leave it alone
                if (
                  member.pointer.location === "code" ||
                  member.pointer.location === "nowhere"
                ) {
                  //if it is, transform it
                  member.pointer = {
                    location: "memory",
                    start,
                    length: Codec.Evm.Utils.WORD_SIZE
                  };
                  start += Codec.Evm.Utils.WORD_SIZE;
                }
              }
            }
          }
          //having now transformed code pointers if needed,
          //we now index by ID
          return Object.assign(
            {},
            ...Object.entries(transformedAllocations).map(
              ([id, allocation]) => ({
                [id]: {
                  members: Object.assign(
                    {},
                    ...allocation.members.map(memberAllocation => ({
                      [memberAllocation.definition.id]: memberAllocation
                    }))
                  )
                }
              })
            )
          );
        }
      )
    },

    /**
     * data.current.compiler
     */
    compiler: createLeaf([evm.current.context], ({ compiler }) => compiler),

    /**
     * data.current.bareLetsInYulAreHit
     */
    bareLetsInYulAreHit: createLeaf(
      ["./compiler"],
      compiler =>
        compiler !== undefined && //if no compiler we'll assume the old way I guess??
        compiler.name === "solc" &&
        semver.satisfies(compiler.version, ">=0.6.8", {
          includePrerelease: true
        })
    ),

    /**
     * data.current.node
     */
    node: createLeaf([sourcemapping.current.node], identity),

    /**
     * data.current.pointer
     */
    pointer: createLeaf([sourcemapping.current.pointer], identity),

    /**
     * data.current.astRef
     * returns null when not in a mapped source
     */
    astRef: createLeaf(
      [
        sourcemapping.current.node,
        sourcemapping.current.pointer,
        "./sourceIndex"
      ],
      (node, pointer, sourceIndex) =>
        node
          ? node.id !== undefined
            ? node.id
            : makePath(sourceIndex, pointer)
          : null
    ),

    /**
     * data.current.scope
     * old alias for data.current.node (deprecated)
     */
    scope: createLeaf(["./node"], identity),

    /**
     * data.current.contract
     * warning: may return null or similar, even though SourceUnit is included
     * as fallback
     */
    contract: createLeaf(
      ["./node", "./scopes/inlined", "./pointer", "./root"],
      (node, scopes, pointer, root) => {
        const types = ["ContractDefinition", "SourceUnit"];
        //SourceUnit included as fallback
        return findAncestorOfType(node, types, scopes, pointer, root);
      }
    ),

    /**
     * data.current.contractForBytecode
     * contract node for the executing bytecode -- *not* the current position!
     * probably not what you usually want
     */
    contractForBytecode: createLeaf(
      [evm.current.context, "./scopes/inlined"],
      ({ contractId }, scopes) =>
        (scopes[contractId] || { definition: null }).definition
    ),

    /**
     * data.current.fallbackOutputForContext
     * returns null if none
     */
    fallbackOutputForContext: createLeaf(
      ["./contractForBytecode"],
      contract => {
        if (!contract) {
          return null;
        }
        const fallbackDefinition = contract.nodes.find(
          node =>
            node.nodeType === "FunctionDefinition" &&
            Codec.Ast.Utils.functionKind(node) === "fallback"
        );
        if (!fallbackDefinition) {
          return null;
        }
        return fallbackDefinition.returnParameters.parameters[0] || null;
      }
    ),

    /**
     * data.current.function
     * may be modifier rather than function!
     */
    function: createLeaf(
      ["./node", "./scopes/inlined", "./pointer", "./root"],
      (node, scopes, pointer, root) => {
        const types = [
          "FunctionDefinition",
          "ModifierDefinition",
          "ContractDefinition",
          "SourceUnit"
        ];
        //SourceUnit included as fallback
        return findAncestorOfType(node, types, scopes, pointer, root);
      }
    ),

    /**
     * data.current.inModifier
     */
    inModifier: createLeaf(
      ["./function"],
      node => node && node.nodeType === "ModifierDefinition"
    ),

    /**
     * data.current.inFunctionOrModifier
     */
    inFunctionOrModifier: createLeaf(
      ["./function"],
      node =>
        node &&
        (node.nodeType === "FunctionDefinition" ||
          node.nodeType === "ModifierDefinition")
    ),

    /**
     * data.current.functionDepth
     */

    functionDepth: createLeaf([sourcemapping.current.functionDepth], identity),

    /**
     * data.current.modifierDepth
     */

    modifierDepth: createLeaf([sourcemapping.current.modifierDepth], identity),

    /**
     * data.current.address
     * NOTE: this is the STORAGE address for the current call, not the CODE
     * address
     */

    address: createLeaf([evm.current.call], call => call.storageAddress),

    /**
     * data.current.functionsByProgramCounter
     */
    functionsByProgramCounter: createLeaf(
      [sourcemapping.current.functionsByProgramCounter],
      functions => functions
    ),

    /**
     * data.current.context
     */
    context: createLeaf([evm.current.context], debuggerContextToDecoderContext),

    /**
     * data.current.fallbackBase
     * gives the stack position where a fallback input would start
     * this is 0 if there are no public or external functions, and 1 if there are
     */
    fallbackBase: createLeaf(
      ["./context"],
      ({ abi }) => (Object.keys(abi).length > 0 ? 1 : 0)
      //note ABI here has been transformed to include functions only
    ),

    /**
     * data.current.errorLocation
     * note: we can't get the actual node from stacktrace,
     * it doesn't store that
     */
    errorLocation: createLeaf(
      [stacktrace.current.innerReturnPosition, stacktrace.current.lastPosition],
      (innerLocation, lastLocation) => innerLocation || lastLocation || {}
    ),

    /**
     * data.current.errorNode
     * note: we can't get the actual node from stacktrace,
     * it only stores the ID
     */
    errorNode: createLeaf(
      ["./errorLocation", "/views/scopes/inlined"],
      (errorLocation, scopes) => {
        const sourceId = (errorLocation.source || {}).id;
        const astId = (errorLocation.node || {}).id;
        if (sourceId !== undefined && astId !== undefined) {
          return scopes[sourceId][astId].definition;
        } else {
          return null;
        }
      }
    ),

    /**
     * data.current.errorId
     * returns a codec-style ID, not just an AST ID
     * does not assume that the error is on the correct node...
     * this could be factored into two selectors (one that finds
     * the node and one that makes the ID)
     */
    errorId: createLeaf(
      ["./errorNode", "./compilationId"],
      (errorNode, compilationId) => {
        if (errorNode === null) {
          return undefined;
        }
        switch (errorNode.nodeType) {
          case "RevertStatement":
            //I don't think this case should happen, but I'm including it
            //for extra certainty
            errorNode = errorNode.errorCall;
          //DELIBERATE FALL-THROUGH
          case "FunctionCall":
            if (
              Codec.Ast.Utils.functionClass(errorNode.expression) !== "error"
            ) {
              return undefined;
            }
            //this should work for both qualified & unqualified errors
            const errorId = errorNode.expression.referencedDeclaration;
            return Codec.Contexts.Import.makeTypeId(errorId, compilationId);
          default:
            //I'm not going to try to handle other cases that maybe could
            //occur with the optimizer on
            return undefined;
        }
      }
    ),

    /**
     * data.current.eventId
     * similar to errorId but for events
     * (and unlike errorId it can just use the current node!)
     */
    eventId: createLeaf(
      ["./node", "./compilationId"],
      (eventNode, compilationId) => {
        if (!eventNode) {
          return undefined;
        }
        switch (eventNode.nodeType) {
          case "EmitStatement":
            //I don't think this case should happen, but I'm including it
            //for extra certainty
            eventNode = eventNode.eventCall;
          //DELIBERATE FALL-THROUGH
          case "FunctionCall":
            if (
              Codec.Ast.Utils.functionClass(eventNode.expression) !== "event"
            ) {
              return undefined;
            }
            //this should work for both qualified & unqualified errors
            const eventId = eventNode.expression.referencedDeclaration;
            return Codec.Contexts.Import.makeTypeId(eventId, compilationId);
          default:
            //I'm not going to try to handle other cases that maybe could
            //occur with the optimizer on
            return undefined;
        }
      }
    ),

    /**
     * data.current.aboutToModify
     * HACK
     * This selector is used to catch those times when we go straight from a
     * modifier invocation into the modifier itself, skipping over the
     * definition node (this includes base constructor calls).  So it should
     * return true when:
     * 1. we're on the node corresponding to an argument to a modifier
     * invocation or base constructor call, or, if said argument is a type
     * conversion, its argument (or nested argument)
     * 2. the next node is not a FunctionDefinition, ModifierDefinition, or
     * in the same modifier / base constructor invocation
     */
    aboutToModify: createLeaf(
      [
        "./node",
        "./modifierInvocation",
        "./modifierArgumentIndex",
        "/next/node",
        "/next/modifierInvocation",
        evm.current.step.isContextChange
      ],
      (node, invocation, index, next, nextInvocation, isContextChange) => {
        //ensure: current instruction is not a context change (because if it is
        //we cannot rely on the data.next selectors, but also if it is we know
        //we're not about to call a modifier or base constructor!)
        //we also want to return false if we can't find things for whatever
        //reason
        if (
          isContextChange ||
          !node ||
          node.id === undefined ||
          !next ||
          next.id === undefined ||
          !invocation ||
          invocation.id === undefined ||
          !nextInvocation ||
          nextInvocation.id === undefined
        ) {
          return false;
        }

        //ensure: current position is in a ModifierInvocation or
        //InheritanceSpecifier (recall that SourceUnit was included as
        //fallback)
        if (invocation.nodeType === "SourceUnit") {
          return false;
        }

        //ensure: next node is not a function definition or modifier definition
        if (
          next.nodeType === "FunctionDefinition" ||
          next.nodeType === "ModifierDefinition"
        ) {
          return false;
        }

        //ensure: next node is not in the same invocation
        if (
          nextInvocation.nodeType !== "SourceUnit" &&
          nextInvocation.id === invocation.id
        ) {
          return false;
        }

        //now: are we on the node corresponding to an argument, or, if
        //it's a type conversion, its nested argument?
        if (index === undefined) {
          return false;
        }
        let argument = invocation.arguments[index];
        while (argument.kind === "typeConversion") {
          if (node.id === argument.id) {
            return true;
          }
          argument = argument.arguments[0];
        }
        return node.id === argument.id;
      }
    ),

    /**
     * data.current.modifierInvocation
     */
    modifierInvocation: createLeaf(
      ["./node", "./scopes/inlined"],
      (node, scopes) => {
        const types = [
          "ModifierInvocation",
          "InheritanceSpecifier",
          "SourceUnit"
        ];
        //again, SourceUnit included as fallback
        return findAncestorOfType(node, types, scopes);
      }
    ),

    /**
     * data.current.modifierArgumentIndex
     * gets the index of the current modifier argument that you're in
     * (undefined when not in a modifier argument)
     */
    modifierArgumentIndex: createLeaf(
      ["./scopes", "./node", "./modifierInvocation"],
      (scopes, node, invocation) => {
        if (!invocation || invocation.nodeType === "SourceUnit") {
          return undefined;
        }

        let pointer = scopes[node.id].pointer;
        let invocationPointer = scopes[invocation.id].pointer;

        //slice the invocation pointer off the beginning
        let difference = pointer.slice(invocationPointer.length);
        debug("difference %s", difference);
        let rawIndex = difference.match(/^\/arguments\/(\d+)/);
        //note that that \d+ is greedy
        debug("rawIndex %o", rawIndex);
        if (rawIndex === null) {
          return undefined;
        }
        return parseInt(rawIndex[1]);
      }
    ),

    /**
     * data.current.modifierBeingInvoked
     * gets the node corresponding to the modifier or base constructor
     * being invoked
     */
    modifierBeingInvoked: createLeaf(
      ["./modifierInvocation", "./scopes/inlined"],
      (invocation, scopes) => {
        if (!invocation || invocation.nodeType === "SourceUnit") {
          return undefined;
        }

        return modifierForInvocation(invocation, scopes);
      }
    ),

    /**
     * data.current.identifiers (namespace)
     */
    identifiers: {
      /**
       * data.current.identifiers (selector)
       *
       * returns identifers and corresponding definition node ID or builtin name
       * (object entries look like [name]: {astRef: astRef}, [name]: {builtin: name})
       */
      _: createLeaf(
        [
          "/current/scopes/inlined",
          "/current/node",
          "/current/pointer",
          "/current/sourceIndex",
          "/current/language"
        ],

        (scopes, scope, pointer, sourceId, language) => {
          let variables = {};
          if (scope !== undefined) {
            let cur =
              scope.id !== undefined ? scope.id : makePath(sourceId, pointer);

            while (cur !== null && scopes[cur]) {
              debug("cur: %o", cur);
              debug("scopes[cur]: %o", scopes[cur]);
              variables = Object.assign(
                variables,
                ...(scopes[cur].variables || [])
                  .filter(variable => variable.name !== "") //exclude anonymous output params
                  .filter(variable => variables[variable.name] == undefined) //don't add shadowed vars
                  .map(variable => ({
                    [variable.name]: { astRef: variable.astRef }
                  }))
              );

              if (scopes[cur].definition.nodeType === "YulFunctionDefinition") {
                //Yul functions make the outside invisible
                break;
              }

              if (scopes[cur].parentId !== undefined) {
                cur = scopes[cur].parentId; //may be null!
                //(undefined means we don't know what's up,
                //null means there's nothing)
              } else {
                //in this case, cur must be a source-and-pointer, so we'll step
                //up that way (skipping over any arrays)
                cur = cur.replace(/\/[^/]*(\/\d+)?$/, "");
              }
            }
          }

          let builtins = {
            msg: { builtin: "msg" },
            tx: { builtin: "tx" },
            block: { builtin: "block" },
            this: { builtin: "this" },
            now: { builtin: "now" }
          };

          if (
            language !== "Solidity" ||
            (scope &&
              (scope.nodeType.startsWith("Yul") ||
                scope.nodeType === "InlineAssembly"))
          ) {
            //Solidity builtins are for Solidity only!
            return variables;
          }

          return { ...builtins, ...variables };
        }
      ),

      /**
       * data.current.identifiers.definitions (namespace)
       */
      definitions: {
        /**
         * data.current.identifiers.definitions (selector)
         * definitions for current variables, by identifier
         */
        _: createLeaf(
          ["/current/scopes/inlined", "../_", "./this", "/current/compiler"],

          (scopes, identifiers, thisDefinition, compiler) => {
            debug("identifiers: %O", identifiers);
            let variables = Object.assign(
              {},
              ...Object.entries(identifiers).map(([identifier, variable]) => {
                if (variable.astRef !== undefined) {
                  let { definition } = scopes[variable.astRef];
                  return { [identifier]: definition };
                  //there used to be separate code for Yul variables here,
                  //but now that's handled in definitionToType
                } else {
                  return {}; //skip over builtins; we'll handle those separately
                }
              })
            );
            let builtins = {
              msg: MSG_DEFINITION,
              tx: TX_DEFINITION,
              block: BLOCK_DEFINITION
            };
            //only include this when it has a proper definition
            if (thisDefinition) {
              builtins.this = thisDefinition;
            }
            //only include now on versions prior to 0.7.0
            if (!solidityVersionHasNoNow(compiler)) {
              debug("adding now");
              builtins.now = NOW_DEFINITION;
            }
            return { ...builtins, ...variables };
          }
        ),

        /*
         * data.current.identifiers.definitions.this
         *
         * returns a spoofed definition for the this variable
         */
        this: createLeaf(["/current/contract"], contractNode =>
          contractNode && contractNode.nodeType === "ContractDefinition"
            ? spoofThisDefinition(
                contractNode.name,
                contractNode.id,
                contractNode.contractKind
              )
            : null
        )
      },

      /**
       * data.current.identifiers.sections
       * used for printing out the variables in sections
       */
      sections: createLeaf(
        ["./definitions", "./refs", "/current/scopes/inlined"],
        (definitions, refs, scopes) => {
          let sections = {
            builtin: [],
            global: [],
            contract: [],
            local: []
          };
          for (const [identifier, ref] of Object.entries(refs)) {
            if (identifier in definitions) {
              switch (ref.location) {
                case "special":
                  sections.builtin.push(identifier);
                  break;
                case "stack":
                  sections.local.push(identifier);
                  break;
                case "storage":
                case "code":
                case "nowhere":
                case "memory":
                  sections.contract.push(identifier);
                  break;
                case "definition":
                  //in this case, look up whether its scope
                  //is a SourceUnit or a ContractDefinition
                  const definition = definitions[identifier];
                  const scope = scopes[definition.scope].definition;
                  if (scope.nodeType === "SourceUnit") {
                    sections.global.push(identifier);
                  } else if (scope.nodeType === "ContractDefinition") {
                    sections.contract.push(identifier);
                  }
                  //other cases shouldn't happen
                  break;
                //other cases shouldn't happen
              }
            }
          }
          return sections;
        }
      ),

      /**
       * data.current.identifiers.refs
       *
       * current variables' value refs
       */
      refs: createLeaf(
        [
          "/proc/assignments",
          "./_",
          "./definitions",
          "/current/scopes/inlined",
          "/current/compilationId",
          "/current/internalSourceFor", //may be null
          "/current/functionDepth", //for pruning things too deep on stack
          "/current/modifierDepth", //when it's useful
          "/current/inModifier"
        ],

        (
          assignments,
          identifiers,
          definitions,
          scopes,
          compilationId,
          internalFor,
          currentDepth,
          modifierDepth,
          inModifier
        ) =>
          Object.assign(
            {},
            ...Object.entries(identifiers).map(
              ([identifier, { astRef, builtin }]) => {
                let id;
                debug("astRef: %o", astRef);
                debug("builtin: %s", builtin);

                //is this an ordinary variable or a builtin?
                if (astRef !== undefined) {
                  //ordinary variable case
                  //first: is this a contract variable?
                  id = stableKeccak256({
                    astRef,
                    compilationId,
                    internalFor
                  });
                  //if not contract, it's local, so identify by stackframe (& etc)
                  if (!(id in assignments)) {
                    id = stableKeccak256({
                      astRef,
                      compilationId,
                      internalFor,
                      stackframe: currentDepth,
                      modifierDepth: inModifier ? modifierDepth : null
                    });
                  }
                  debug("id after local: %s", id);
                  //if it's not that either, but it's a constant, maybe it's a
                  //global (if it is, whip up an assignment rather than extracting
                  //one from assignments!)
                  if (!(id in assignments)) {
                    const definition = definitions[identifier];
                    debug("global definition: %o", definition);
                    if (definition.scope !== undefined) {
                      const scope = scopes[definition.scope].definition;
                      if (
                        scope.nodeType === "SourceUnit" &&
                        (definition.constant === true ||
                          definition.mutability === "constant")
                      ) {
                        return {
                          [identifier]: {
                            location: "definition",
                            definition: definition.value
                          }
                        };
                      }
                    }
                  }
                } else {
                  //it's a builtin
                  id = stableKeccak256({
                    builtin
                  });
                }

                //if we still didn't find it, oh well
                debug("id: %s", id);

                let { ref } = assignments[id] || {};
                if (!ref) {
                  return {}; //don't add anything
                }
                return {
                  [identifier]: ref
                };
              }
            )
          )
      )
    },

    /**
     * data.current.returnStatus
     */
    returnStatus: createLeaf(
      [evm.current.step.returnStatus],
      status => (status === null ? undefined : status) //convert null to undefined to be safe
    ),

    /**
     * data.current.returnAllocation
     */
    returnAllocation: createLeaf(
      [
        evm.current.call,
        "/current/context",
        "/info/allocations/calldata",
        "./fallbackOutputForContext"
      ],
      (
        { data: calldata },
        { context, isConstructor, fallbackAbi },
        { constructorAllocations, functionAllocations },
        contractHasFallbackOutput //just using truthiness here
      ) => {
        if (isConstructor) {
          //we're in a constructor call
          let allocation = constructorAllocations[context];
          if (!allocation) {
            return null;
          }
          return allocation.output;
        } else {
          //usual case
          let selector = calldata.slice(0, 2 + 4 * 2); //extract first 4 bytes of hex string
          debug("selector: %s", selector);
          debug("bySelector: %o", functionAllocations[context]);
          let allocation = (functionAllocations[context] || {})[selector];
          if (allocation) {
            return allocation.output;
          } else {
            //we're in a fallback or receive, presumably.
            //so is it a fallback, and does it have output?
            if (
              (calldata !== "0x" || fallbackAbi.receive === null) &&
              fallbackAbi.fallback !== null && //this check is redundant, but let's include it
              contractHasFallbackOutput
            ) {
              return Codec.AbiData.Allocate.FallbackOutputAllocation;
            } else {
              return null;
            }
          }
        }
      }
    ),

    /**
     * data.current.isCall
     */
    isCall: createLeaf([evm.current.step.isCall], identity),

    /**
     * data.current.isCreate
     */
    isCreate: createLeaf([evm.current.step.isCreate], identity),

    /**
     * data.current.currentCallIsCreate
     */
    currentCallIsCreate: createLeaf(
      [evm.current.call],
      call => call.binary !== undefined
    ),

    /**
     * data.current.callContext
     * note that we convert to decoder context!
     */
    callContext: createLeaf(
      [evm.current.step.callContext],
      debuggerContextToDecoderContext
    ),

    /**
     * data.current.isPop
     */
    isPop: createLeaf([evm.current.step.isPop], identity)
  },

  /**
   * data.next
   */
  next: {
    /**
     * data.next.state
     * Yes, I'm just repeating the code for data.current.state.stack here;
     * not worth the trouble to factor out
     */
    state: {
      /**
       * data.next.state.stack
       */
      stack: createLeaf(
        [evm.next.state.stack],

        words => (words || []).map(word => Codec.Conversion.toBytes(word))
      ),

      /**
       * data.next.state.returndata
       * NOTE: this is only for use by decodeReturnValue(); this is *not*
       * an accurate reflection of the current contents of returndata!
       * we don't track that at the moment
       */
      returndata: createLeaf([evm.current.step.returnValue], data =>
        Codec.Conversion.toBytes(data)
      ),

      /**
       * data.next.state.calldata
       * NOTE: this is only for use by decodeCall(); this is *not*
       * necessarily the actual next contents of calldata!
       */
      calldata: createLeaf(
        [
          evm.current.step.isCall,
          evm.current.step.isCreate,
          evm.current.step.callData,
          evm.current.step.createBinary
        ],
        (isCall, isCreate, data, binary) => {
          if (!isCall && !isCreate) {
            return null;
          }
          return Codec.Conversion.toBytes(isCall ? data : binary);
        }
      )
    },

    //HACK WARNING
    //the following selectors depend on sourcemapping.next
    //do not use them when the current instruction is a context change!

    /**
     * data.next.node
     */
    node: createLeaf([sourcemapping.next.node], identity),

    /**
     * data.next.pointer
     */
    pointer: createLeaf([sourcemapping.next.pointer], identity),

    /**
     * data.next.modifierInvocation
     * Note: yes, I'm just repeating the code from data.current here but with
     * invalid added
     */
    modifierInvocation: createLeaf(
      ["./node", "/current/scopes/inlined", evm.current.step.isContextChange],
      (node, scopes, invalid) => {
        //don't attempt this at a context change!
        //(also don't attempt this if we can't find the node for whatever
        //reason)
        if (invalid) {
          return undefined;
        }
        const types = [
          "ModifierInvocation",
          "InheritanceSpecifier",
          "SourceUnit"
        ];
        //again, SourceUnit included as fallback
        return findAncestorOfType(node, types, scopes);
      }
    ),

    /**
     * data.next.modifierBeingInvoked
     */
    modifierBeingInvoked: createLeaf(
      [
        "./modifierInvocation",
        "/current/scopes/inlined",
        evm.current.step.isContextChange
      ],
      (invocation, scopes, invalid) => {
        if (invalid || !invocation || invocation.nodeType === "SourceUnit") {
          return undefined;
        }

        return modifierForInvocation(invocation, scopes);
      }
    )
    //END HACK WARNING
  },

  /**
   * data.nextUserStep
   */
  nextUserStep: {
    /**
     * data.nextUserStep.state
     * Yes, I'm just repeating the code for data.current.state.stack here;
     * not worth the trouble to factor out
     * HACK: this assumes we're not about to change context! don't use this if we
     * are!
     */
    state: {
      /**
       * data.nextUserStep.state.stack
       */
      stack: createLeaf(
        [sourcemapping.current.nextUserStep],

        step =>
          ((step || {}).stack || []).map(word => Codec.Conversion.toBytes(word))
      )
    }
  },

  /**
   * data.nextOfSameDepth
   */
  nextOfSameDepth: {
    /**
     * data.nextOfSameDepth.state
     * Yes, I'm just repeating the code for data.current.state.stack here but
     * with an extra guard... *still* not worth the trouble to factor out
     * HOWEVER, this one also returns null if there is no nextOfSameDepth
     */
    state: {
      /**
       * data.nextOfSameDepth.state.stack
       */
      stack: createLeaf(
        [trace.nextOfSameDepth],

        step =>
          step
            ? (step.stack || []).map(word => Codec.Conversion.toBytes(word))
            : null
      )
    }
  }
});

export default data;
