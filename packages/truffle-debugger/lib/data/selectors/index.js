import debugModule from "debug";
const debug = debugModule("debugger:data:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";
import jsonpointer from "json-pointer";

import { stableKeccak256 } from "lib/helpers";

import evm from "lib/evm/selectors";
import solidity from "lib/solidity/selectors";

import * as DecodeUtils from "truffle-decode-utils";
import { forEvmState } from "truffle-decoder";

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
          node.nodeType === "FunctionDefinition" && node.kind === "constructor"
      );
    default:
      //we should never hit this case
      return undefined;
  }
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

    /**
     * data.views.decoder
     *
     * selector returns (ast node definition, data reference) => Promise<value>
     */
    decoder: createLeaf(
      [
        "/views/referenceDeclarations",
        "/current/state",
        "/views/mappingKeys",
        "/info/allocations"
      ],

      (referenceDeclarations, state, mappingKeys, allocations) => (
        definition,
        ref
      ) =>
        forEvmState(definition, ref, {
          referenceDeclarations,
          state,
          mappingKeys,
          storageAllocations: allocations.storage,
          memoryAllocations: allocations.memory,
          calldataAllocations: allocations.calldata
        })
    ),

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
      ["/proc/mappedPaths", "/current/address", "/current/dummyAddress"],
      (mappedPaths, address, dummyAddress) =>
        []
          .concat(
            ...Object.values(
              (mappedPaths.byAddress[address || dummyAddress] || { byType: {} })
                .byType
            ).map(({ bySlotAddress }) => Object.values(bySlotAddress))
          )
          .filter(slot => slot.key !== undefined)
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
        [evm.current.state.storage],

        mapping =>
          Object.assign(
            {},
            ...Object.entries(mapping).map(([address, word]) => ({
              [`0x${address}`]: DecodeUtils.Conversion.toBytes(word)
            }))
          )
      )
    },

    /**
     * data.current.scope
     * this should probably be named data.current.node!
     */
    scope: createLeaf([solidity.current.node], identity),

    /**
     * data.current.functionDepth
     */

    functionDepth: createLeaf([solidity.current.functionDepth], identity),

    /**
     * data.current.address
     * Note: May be undefined (if in a constructor)
     */

    address: createLeaf([evm.current.call], call => call.address),

    /**
     * data.current.dummyAddress
     */

    dummyAddress: createLeaf([evm.current.creationDepth], identity),

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
        "./scope",
        "./modifierInvocation",
        "./modifierArgumentIndex",
        "/next/scope",
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
      ["./scope", "/views/scopes/inlined"],
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
      ["/info/scopes", "./scope", "./modifierInvocation"],
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
       * returns identifers and corresponding definition node ID
       */
      _: createLeaf(
        ["/views/scopes/inlined", "/current/scope"],

        (scopes, scope) => {
          let cur = scope.id;
          let variables = {};

          do {
            variables = Object.assign(
              variables,
              ...(scopes[cur].variables || [])
                .filter(v => v.name !== "") //exclude anonymous output params
                .filter(v => variables[v.name] == undefined)
                .map(v => ({ [v.name]: v.id }))
            );

            cur = scopes[cur].parentId;
          } while (cur != null);

          return variables;
        }
      ),

      /**
       * data.current.identifiers.definitions
       *
       * current variable definitions
       */
      definitions: createLeaf(
        ["/views/scopes/inlined", "./_"],

        (scopes, identifiers) =>
          Object.assign(
            {},
            ...Object.entries(identifiers).map(([identifier, id]) => {
              let { definition } = scopes[id];

              return { [identifier]: definition };
            })
          )
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
          "/current/functionDepth", //for pruning things too deep on stack
          "/current/address", //for contract variables
          "/current/dummyAddress" //for contract vars when in creation call
        ],

        (assignments, identifiers, currentDepth, address, dummyAddress) =>
          Object.assign(
            {},
            ...Object.entries(identifiers).map(([identifier, astId]) => {
              //note: this needs tweaking for specials later
              let id;

              //first, check if it's a contract var
              if (address !== undefined) {
                let matchIds = (assignments.byAstId[astId] || []).filter(
                  idHash => assignments.byId[idHash].address === address
                );
                if (matchIds.length > 0) {
                  id = matchIds[0]; //there should only be one!
                }
              } else {
                let matchIds = (assignments.byAstId[astId] || []).filter(
                  idHash =>
                    assignments.byId[idHash].dummyAddress === dummyAddress
                );
                if (matchIds.length > 0) {
                  id = matchIds[0]; //again, there should only be one!
                }
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

              //if we still didn't find it, oh well

              let { ref } = assignments.byId[id] || {};
              if (!ref) {
                return undefined;
              }

              return {
                [identifier]: ref
              };
            })
          )
      ),

      /**
       * data.current.identifiers.decoded
       *
       * Returns an object with values as Promises
       */
      decoded: createLeaf(
        ["/views/decoder", "./definitions", "./refs"],

        async (decode, definitions, refs) => {
          debug("setting up keyedPromises");
          const keyedPromises = Object.entries(refs).map(
            async ([identifier, ref]) => ({
              [identifier]: await decode(definitions[identifier], ref)
            })
          );
          debug("set up keyedPromises");
          const keyedResults = await Promise.all(keyedPromises);
          debug("got keyedResults");
          return DecodeUtils.Conversion.cleanContainers(
            Object.assign({}, ...keyedResults)
          );
        }
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
     * data.next.scope
     * this should probably be named data.next.node!
     */
    scope: createLeaf([solidity.next.node], identity),

    /**
     * data.next.function
     */
    function: createLeaf(
      ["./scope", "/views/scopes/inlined", evm.current.step.isContextChange],
      (node, scopes, invalid) => {
        //don't attempt this at a context change!
        //(also don't attempt this if we can't find the node for whatever
        //reason)
        if (invalid || !node) {
          return undefined;
        }
        const types = [
          "FunctionDefinition",
          "ModifierDefinition",
          "ContractDefinition",
          "SourceUnit"
        ];
        //no, not all of these are function definitions, as such, but I want a
        //fallback in case we're outside a function definition somehow
        return findAncestorOfType(node, types, scopes);
      }
    ),

    /**
     * data.next.modifierInvocation
     * Note: yes, I'm just repeating the code from data.current here but with
     * invalid added
     */
    modifierInvocation: createLeaf(
      ["./scope", "/views/scopes/inlined", evm.current.step.isContextChange],
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
  }
});

export default data;
