import debugModule from "debug";
const debug = debugModule("debugger:data:selectors"); // eslint-disable-line no-unused-vars

import { createSelectorTree, createLeaf } from "reselect-tree";
import jsonpointer from "json-pointer";

import { stableKeccak256 } from "lib/helpers";

import ast from "lib/ast/selectors";
import evm from "lib/evm/selectors";
import solidity from "lib/solidity/selectors";

import * as TruffleDecodeUtils from "truffle-decode-utils";
import { forEvmState } from "truffle-decoder";
import { getStorageAllocations } from "truffle-decoder";

/**
 * @private
 */
const identity = x => x;

function createStateSelectors({ stack, memory, storage }) {
  return {
    /**
     * .stack
     */
    stack: createLeaf(
      [stack],

      words =>
        (words || []).map(word =>
          TruffleDecodeUtils.Conversion.toBytes(
            TruffleDecodeUtils.Conversion.toBN(
              word,
              TruffleDecodeUtils.EVM.WORD_SIZE
            )
          )
        )
    ),

    /**
     * .memory
     */
    memory: createLeaf(
      [memory],

      words =>
        new Uint8Array(
          (words.join("").match(/.{1,2}/g) || []).map(byte =>
            parseInt(byte, 16)
          )
        )
    ),

    /**
     * .storage
     */
    storage: createLeaf(
      [storage],

      mapping =>
        Object.assign(
          {},
          ...Object.entries(mapping).map(([address, word]) => ({
            [`0x${address}`]: new Uint8Array(
              (word.match(/.{1,2}/g) || []).map(byte => parseInt(byte, 16))
            )
          }))
        )
    )
  };
}

const data = createSelectorTree({
  state: state => state.data,

  /**
   * data.views
   */
  views: {
    /**
     * data.views.ast
     */
    ast: createLeaf([ast.current], tree => tree),

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
        "/next/state",
        "/proc/mappingKeys",
        "/views/allocations/storage"
      ],

      (referenceDeclarations, state, mappingKeys, storageAllocations) => (
        definition,
        ref
      ) =>
        forEvmState(definition, ref, {
          referenceDeclarations,
          state,
          mappingKeys,
          storageAllocations
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

    /*
     * data.views.allocations
     */
    allocations: {
      /*
       * data.views.allocations.storage
       */
      storage: createLeaf(
        ["../userDefinedTypes/contractDefinitions", "../referenceDeclarations"],
        (contracts, referenceDeclarations) =>
          getStorageAllocations(referenceDeclarations, contracts)
      )
    }
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
            if (
              definition.nodeType !== "ContractDefinition" ||
              scope.variables === undefined
            ) {
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
            newScope.variables = [].concat(
              ...linearizedBaseContractsFromBase.map(
                contractId => scopes[contractId].variables
              )
            );
            return { [id]: newScope };
          })
        )
      ),

      /*
       * data.info.scopes.raw
       */
      raw: createLeaf(["/state"], state => state.info.scopes.byId)
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

    /**
     * data.proc.mappingKeys
     *
     * known keys for each mapping (identified by node ID)
     */
    mappingKeys: createLeaf(["/state"], state => state.proc.mappingKeys.byId),

    /**
     * data.proc.decodingMappingKeys
     *
     * number of mapping keys that are still decoding
     */
    decodingMappingKeys: createLeaf(
      ["/state"],
      state => state.proc.mappingKeys.decodingStarted
    )
  },

  /**
   * data.current
   */
  current: {
    /**
     *
     * data.current.scope
     */
    scope: {
      /**
       * data.current.scope.id
       */
      id: createLeaf([ast.current.node], node => node.id)
    },

    /**
     * data.current.state
     */
    state: createStateSelectors(evm.current.state),

    /**
     * data.current.functionDepth
     */

    functionDepth: createLeaf([solidity.current.functionDepth], identity),

    /**
     * data.current.address
     * Note: May be undefined (if in an initializer)
     */

    address: createLeaf([evm.current.call], call => call.address),

    /**
     * data.current.dummyAddress
     */

    dummyAddress: createLeaf([evm.current.creationDepth], identity),

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
          solidity.current.functionDepth, //for pruning things too deep on stack
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
          const keyedPromises = Object.entries(refs).map(
            async ([identifier, ref]) => ({
              [identifier]: await decode(definitions[identifier], ref)
            })
          );
          const keyedResults = await Promise.all(keyedPromises);
          return TruffleDecodeUtils.Conversion.cleanContainers(
            Object.assign({}, ...keyedResults)
          );
        }
      ),

      /**
       * data.current.identifiers.native
       *
       * Returns an object with values as Promises
       */
      native: createLeaf(["./decoded"], async decoded => {
        return TruffleDecodeUtils.Conversion.cleanBNs(await decoded);
      })
    }
  },

  /**
   * data.next
   */
  next: {
    /**
     * data.next.state
     */
    state: createStateSelectors(evm.next.state)
  }
});

export default data;
