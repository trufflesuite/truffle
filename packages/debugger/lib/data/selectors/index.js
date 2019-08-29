import debugModule from "debug";
const debug = debugModule("debugger:data:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";
import jsonpointer from "json-pointer";

import { stableKeccak256 } from "lib/helpers";

import evm from "lib/evm/selectors";
import solidity from "lib/solidity/selectors";

import * as DecodeUtils from "truffle-decode-utils";

/**
 * @private
 */
const identity = x => x;

function findAncestorOfType(node, types, scopes) {
  //note: I'm not including any protection against null in this function.
  //You are advised to include "SourceUnit" as a fallback type.
  while (node && !types.includes(node.nodeType)) {
    node = scopes[scopes[node.id].parentId].definition;
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
          DecodeUtils.Definition.functionKind(node) === "constructor"
      );
    default:
      //we should never hit this case
      return undefined;
  }
}

//see data.views.contexts for an explanation
function debuggerContextToDecoderContext(context) {
  let {
    contractName,
    binary,
    contractId,
    contractKind,
    isConstructor,
    abi
  } = context;
  return {
    contractName,
    binary,
    contractId,
    contractKind,
    isConstructor,
    abi: DecodeUtils.Contexts.abiToFunctionAbiWithSignatures(abi)
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
      [solidity.current.isSourceRangeFinal],
      final => final
    ),

    /**
     * data.views.scopes (namespace)
     */
    scopes: {
      /**
       * data.views.scopes.inlined (namespace)
       */
      inlined: {
        /**
         * data.views.scopes.inlined (selector)
         * see data.info.scopes for how this differs from the raw version
         */
        _: createLeaf(["/info/scopes", "./raw"], (scopes, inlined) =>
          Object.assign(
            {},
            ...Object.entries(inlined).map(([id, info]) => {
              let newInfo = { ...info };
              newInfo.variables = scopes[id].variables;
              return { [id]: newInfo };
            })
          )
        ),

        /**
         * data.views.scopes.inlined.raw
         */
        raw: createLeaf(
          ["/info/scopes/raw", solidity.info.sources],

          (scopes, sources) =>
            Object.assign(
              {},
              ...Object.entries(scopes).map(([id, entry]) => ({
                [id]: {
                  ...entry,

                  definition: jsonpointer.get(
                    sources[entry.sourceId].ast,
                    entry.pointer
                  )
                }
              }))
            )
        )
      }
    },

    /*
     * data.views.userDefinedTypes
     */
    userDefinedTypes: {
      /*
       * data.views.userDefinedTypes.contractDefinitions
       * restrict to contracts only, and get their definitions
       */
      contractDefinitions: createLeaf(
        ["/info/userDefinedTypes", "/views/scopes/inlined"],
        (typeIds, scopes) =>
          typeIds
            .map(id => scopes[id].definition)
            .filter(node => node.nodeType === "ContractDefinition")
      )
    },

    /*
     * data.views.referenceDeclarations
     */
    referenceDeclarations: createLeaf(
      ["./scopes/inlined", "/info/userDefinedTypes"],
      (scopes, userDefinedTypes) =>
        Object.assign(
          {},
          ...userDefinedTypes.map(id => ({ [id]: scopes[id].definition }))
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
          [address]: DecodeUtils.Conversion.toBytes(binary)
        }))
      )
    ),

    /*
     * data.views.contexts
     * same as evm.info.contexts, but:
     * 0. we only include non-constructor contexts
     * 1. we now index by contract ID rather than hash
     * 2. we strip out context, sourceMap, primarySource, and compiler
     * 3. we alter abi in several ways:
     * 3a. we strip abi down to just (ordinary) functions
     * 3b. we augment these functions with signatures (here meaning selectors)
     * 3c. abi is now an object, not an array, and indexed by these signatures
     */
    contexts: createLeaf([evm.info.contexts], contexts =>
      Object.assign(
        {},
        ...Object.values(contexts)
          .filter(context => !context.isConstructor)
          .map(context => ({
            [context.contractId]: debuggerContextToDecoderContext(context)
          }))
      )
    )
  },

  /**
   * data.info
   */
  info: {
    /**
     * data.info.scopes (namespace)
     */
    scopes: {
      /**
       * data.info.scopes (selector)
       * the raw version is below; this version accounts for inheritance
       * NOTE: doesn't this selector really belong in data.views?  Yes.
       * But, since it's replacing the old data.info.scopes (which is now
       * data.info.scopes.raw), I didn't want to move it.
       */
      _: createLeaf(["./raw", "/views/scopes/inlined/raw"], (scopes, inlined) =>
        Object.assign(
          {},
          ...Object.entries(scopes).map(([id, scope]) => {
            let definition = inlined[id].definition;
            if (definition.nodeType !== "ContractDefinition") {
              return { [id]: scope };
            }
            //if we've reached this point, we should be dealing with a
            //contract, and specifically a contract -- not an interface or
            //library (those don't get "variables" entries in their scopes)
            debug("contract id %d", id);
            let newScope = { ...scope };
            //note that Solidity gives us the linearization in order from most
            //derived to most base, but we want most base to most derived;
            //annoyingly, reverse() is in-place, so we clone with slice() first
            let linearizedBaseContractsFromBase = definition.linearizedBaseContracts
              .slice()
              .reverse();
            //now, we put it all together
            newScope.variables = []
              .concat(
                ...linearizedBaseContractsFromBase.map(
                  contractId => scopes[contractId].variables || []
                  //we need the || [] because contracts with no state variables
                  //have variables undefined rather than empty like you'd expect
                )
              )
              .filter(variable => {
                //...except, HACK, let's filter out those constants we don't know
                //how to read.  they'll just clutter things up.
                debug("variable %O", variable);
                let definition = inlined[variable.id].definition;
                return (
                  !definition.constant ||
                  DecodeUtils.Definition.isSimpleConstant(definition.value)
                );
              });

            return { [id]: newScope };
          })
        )
      ),

      /*
       * data.info.scopes.raw
       */
      raw: createLeaf(["/state"], state => state.info.scopes.byId)
    },

    /*
     * data.info.allocations
     */
    allocations: {
      /*
       * data.info.allocations.storage
       */
      storage: createLeaf(["/state"], state => state.info.allocations.storage),

      /*
       * data.info.allocations.memory
       */
      memory: createLeaf(["/state"], state => state.info.allocations.memory),

      /*
       * data.info.allocations.calldata
       */
      calldata: createLeaf(["/state"], state => state.info.allocations.calldata)
    },

    /**
     * data.info.userDefinedTypes
     */
    userDefinedTypes: createLeaf(
      ["/state"],
      state => state.info.userDefinedTypes
    )
  },

  /**
   * data.proc
   */
  proc: {
    /**
     * data.proc.assignments
     */
    assignments: createLeaf(
      ["/state"],
      state => state.proc.assignments
      //note: this no longer fetches just the byId, but rather the whole
      //assignments object
    ),

    /*
     * data.proc.mappedPaths
     */
    mappedPaths: createLeaf(["/state"], state => state.proc.mappedPaths),

    /**
     * data.proc.decodingKeys
     *
     * number of keys that are still decoding
     */
    decodingKeys: createLeaf(
      ["./mappedPaths"],
      mappedPaths => mappedPaths.decodingStarted
    )
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

        words => (words || []).map(word => DecodeUtils.Conversion.toBytes(word))
      ),

      /**
       * data.current.state.memory
       */
      memory: createLeaf(
        [evm.current.state.memory],

        words => DecodeUtils.Conversion.toBytes(words.join(""))
      ),

      /**
       * data.current.state.calldata
       */
      calldata: createLeaf(
        [evm.current.call],

        ({ data }) => DecodeUtils.Conversion.toBytes(data)
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
              [`0x${address}`]: DecodeUtils.Conversion.toBytes(word)
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
          this: DecodeUtils.Conversion.toBytes(address),

          sender: DecodeUtils.Conversion.toBytes(sender),

          value: DecodeUtils.Conversion.toBytes(value),

          //let's crack open that tx and block!
          ...Object.assign(
            {},
            ...Object.entries(tx).map(([variable, value]) => ({
              [variable]: DecodeUtils.Conversion.toBytes(value)
            }))
          ),

          ...Object.assign(
            {},
            ...Object.entries(block).map(([variable, value]) => ({
              [variable]: DecodeUtils.Conversion.toBytes(value)
            }))
          )
        })
      )
    },

    /**
     * data.current.node
     */
    node: createLeaf([solidity.current.node], identity),

    /**
     * data.current.scope
     * old alias for data.current.node (deprecated)
     */
    scope: createLeaf(["./node"], identity),

    /*
     * data.current.contract
     * warning: may return null or similar, even though SourceUnit is included
     * as fallback
     */
    contract: createLeaf(
      ["./node", "/views/scopes/inlined"],
      (node, scopes) => {
        const types = ["ContractDefinition", "SourceUnit"];
        //SourceUnit included as fallback
        return findAncestorOfType(node, types, scopes);
      }
    ),

    /**
     * data.current.functionDepth
     */

    functionDepth: createLeaf([solidity.current.functionDepth], identity),

    /**
     * data.current.address
     * NOTE: this is the STORAGE address for the current call, not the CODE
     * address
     */

    address: createLeaf([evm.current.call], call => call.storageAddress),

    /*
     * data.current.functionsByProgramCounter
     */
    functionsByProgramCounter: createLeaf(
      [solidity.current.functionsByProgramCounter],
      functions => functions
    ),

    /*
     * data.current.context
     */
    context: createLeaf([evm.current.context], debuggerContextToDecoderContext),

    /*
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
          !next ||
          !invocation ||
          !nextInvocation
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

    /*
     * data.current.modifierInvocation
     */
    modifierInvocation: createLeaf(
      ["./node", "/views/scopes/inlined"],
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
      ["/info/scopes", "./node", "./modifierInvocation"],
      (scopes, node, invocation) => {
        if (invocation.nodeType === "SourceUnit") {
          return undefined;
        }

        let pointer = scopes[node.id].pointer;
        let invocationPointer = scopes[invocation.id].pointer;

        //slice the invocation pointer off the beginning
        let difference = pointer.replace(invocationPointer, "");
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

    /*
     * data.current.modifierBeingInvoked
     * gets the node corresponding to the modifier or base constructor
     * being invoked
     */
    modifierBeingInvoked: createLeaf(
      ["./modifierInvocation", "/views/scopes/inlined"],
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
       * (object entries look like [name]: {astId: id} or like [name]: {builtin: name}
       */
      _: createLeaf(
        ["/views/scopes/inlined", "/current/node"],

        (scopes, scope) => {
          let variables = {};
          if (scope !== undefined) {
            let cur = scope.id;

            do {
              variables = Object.assign(
                variables,
                ...(scopes[cur].variables || [])
                  .filter(v => v.name !== "") //exclude anonymous output params
                  .filter(v => variables[v.name] == undefined)
                  .map(v => ({ [v.name]: { astId: v.id } }))
              );

              cur = scopes[cur].parentId;
            } while (cur != null);
          }

          let builtins = {
            msg: { builtin: "msg" },
            tx: { builtin: "tx" },
            block: { builtin: "block" },
            this: { builtin: "this" },
            now: { builtin: "now" }
          };

          return { ...variables, ...builtins };
        }
      ),

      /**
       * data.current.identifiers.definitions (namespace)
       */
      definitions: {
        /* data.current.identifiers.definitions (selector)
         * definitions for current variables, by identifier
         */
        _: createLeaf(
          ["/views/scopes/inlined", "../_", "./this"],

          (scopes, identifiers, thisDefinition) => {
            let variables = Object.assign(
              {},
              ...Object.entries(identifiers).map(([identifier, { astId }]) => {
                if (astId !== undefined) {
                  //will be undefined for builtins
                  let { definition } = scopes[astId];
                  return { [identifier]: definition };
                } else {
                  return {}; //skip over builtins; we'll handle those separately
                }
              })
            );
            let builtins = {
              msg: DecodeUtils.Definition.MSG_DEFINITION,
              tx: DecodeUtils.Definition.TX_DEFINITION,
              block: DecodeUtils.Definition.BLOCK_DEFINITION,
              now: DecodeUtils.Definition.spoofUintDefinition("now")
            };
            //only include this when it has a proper definition
            if (thisDefinition) {
              builtins.this = thisDefinition;
            }
            return { ...variables, ...builtins };
          }
        ),

        /*
         * data.current.identifiers.definitions.this
         *
         * returns a spoofed definition for the this variable
         */
        this: createLeaf(
          ["/current/contract"],
          contractNode =>
            contractNode && contractNode.nodeType === "ContractDefinition"
              ? DecodeUtils.Definition.spoofThisDefinition(
                  contractNode.name,
                  contractNode.id
                )
              : null
        )
      },

      /**
       * data.current.identifiers.refs
       *
       * current variables' value refs
       */
      refs: createLeaf(
        [
          "/proc/assignments",
          "./_",
          "/current/functionDepth", //for pruning things too deep on stack
          "/current/address" //for contract variables
        ],

        (assignments, identifiers, currentDepth, address) =>
          Object.assign(
            {},
            ...Object.entries(identifiers).map(
              ([identifier, { astId, builtin }]) => {
                let id;

                //is this an ordinary variable or a builtin?
                if (astId !== undefined) {
                  //if not a builtin, first check if it's a contract var
                  let matchIds = (assignments.byAstId[astId] || []).filter(
                    idHash => assignments.byId[idHash].address === address
                  );
                  if (matchIds.length > 0) {
                    id = matchIds[0]; //there should only be one!
                  }

                  //if not contract, it's local, so find the innermost
                  //(but not beyond current depth)
                  if (id === undefined) {
                    let matchFrames = (assignments.byAstId[astId] || [])
                      .map(id => assignments.byId[id].stackframe)
                      .filter(stackframe => stackframe !== undefined);

                    if (matchFrames.length > 0) {
                      //this check isn't *really*
                      //necessary, but may as well prevent stupid stuff
                      let maxMatch = Math.min(
                        currentDepth,
                        Math.max(...matchFrames)
                      );
                      id = stableKeccak256({ astId, stackframe: maxMatch });
                    }
                  }
                } else {
                  //otherwise, it's a builtin
                  //NOTE: for now we assume there is only one assignment per
                  //builtin, but this will change in the future
                  id = assignments.byBuiltin[builtin][0];
                }

                //if we still didn't find it, oh well

                let { ref } = assignments.byId[id] || {};
                if (!ref) {
                  return undefined;
                }

                return {
                  [identifier]: ref
                };
              }
            )
          )
      )
    }
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

        words => (words || []).map(word => DecodeUtils.Conversion.toBytes(word))
      )
    },

    //HACK WARNING
    //the following selectors depend on solidity.next
    //do not use them when the current instruction is a context change!

    /**
     * data.next.node
     */
    node: createLeaf([solidity.next.node], identity),

    /**
     * data.next.modifierInvocation
     * Note: yes, I'm just repeating the code from data.current here but with
     * invalid added
     */
    modifierInvocation: createLeaf(
      ["./node", "/views/scopes/inlined", evm.current.step.isContextChange],
      (node, scopes, invalid) => {
        //don't attempt this at a context change!
        //(also don't attempt this if we can't find the node for whatever
        //reason)
        if (invalid || !node) {
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

    /*
     * data.next.modifierBeingInvoked
     */
    modifierBeingInvoked: createLeaf(
      [
        "./modifierInvocation",
        "/views/scopes/inlined",
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
   * data.nextMapped
   */
  nextMapped: {
    /**
     * data.nextMapped.state
     * Yes, I'm just repeating the code for data.current.state.stack here;
     * not worth the trouble to factor out
     * HACK: this assumes we're not about to change context! don't use this if we
     * are!
     */
    state: {
      /**
       * data.nextMapped.state.stack
       */
      stack: createLeaf(
        [solidity.current.nextMapped],

        step =>
          ((step || {}).stack || []).map(word =>
            DecodeUtils.Conversion.toBytes(word)
          )
      )
    }
  }
});

export default data;
