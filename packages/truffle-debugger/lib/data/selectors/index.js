import { createSelectorTree, createLeaf } from "reselect-tree";
import jsonpointer from "json-pointer";

import { stableKeccak256 } from "lib/helpers";

import ast from "lib/ast/selectors";
import evm from "lib/evm/selectors";
import solidity from "lib/solidity/selectors";

import * as TruffleDecodeUtils from "truffle-decode-utils";
import { forEvmState } from "truffle-decoder";

/**
 * @private
 */
const identity = (x) => x

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
    ast: createLeaf([ast.current], tree => tree),

    atLastInstructionForSourceRange: createLeaf(
      [solidity.current.isSourceRangeFinal],
      final => final
    ),

    /**
     * data.views.scopes
     */
    scopes: {
      /**
       * data.views.scopes.inlined
       */
      inlined: createLeaf(
        ["/info/scopes", solidity.info.sources],

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
    },

    /**
     * data.views.decoder
     *
     * selector returns (ast node definition, data reference) => Promise<value>
     */
    decoder: createLeaf(
      ["/views/scopes/inlined", "/next/state", "/proc/mappingKeys"],

      (scopes, state, mappingKeys) => (definition, ref) =>
        forEvmState(definition, ref, {
          scopes,
          state,
          mappingKeys
        })
    )
  },

  /**
   * data.info
   */
  info: {
    /**
     * data.info.scopes
     */
    scopes: createLeaf(["/state"], state => state.info.scopes.byId)
  },

  /**
   * data.proc
   */
  proc: {
    /**
     * data.proc.assignments
     */
    assignments: createLeaf(
      ["/state"], (state) => state.proc.assignments
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

    functionDepth: createLeaf(
      [solidity.current.functionDepth], identity),

    /**
     * data.current.address
     * Note: May be undefined (if in an initializer)
     */

    address: createLeaf(
      [evm.current.call], (call) => call.address),

    /**
     * data.current.dummyAddress
     */

    dummyAddress: createLeaf(
      [evm.current.creationDepth], identity),

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
          Object.assign({},
            ...Object.entries(identifiers)
              .map( ([identifier, astId]) => {
                //note: this needs tweaking for specials later
                let id;

                //first, check if it's a contract var
                if(address !== undefined) {
                  let matchIds = (assignments.byAstId[astId] || []).filter(
                    (idHash) => assignments.byId[idHash].address === address
                  )
                  if(matchIds.length > 0) {
                    id = matchIds[0]; //there should only be one!
                  }
                }
                else {
                  let matchIds = (assignments.byAstId[astId] || []).filter(
                    (idHash) => assignments.byId[idHash].dummyAddress
                      === dummyAddress
                  )
                  if(matchIds.length > 0) {
                    id = matchIds[0]; //again, there should only be one!
                  }
                }
              
                //if not contract, it's local, so find the innermost
                //(but not beyond current depth)
                if(id === undefined){
                  let matchFrames = (assignments.byAstId[astId] || []).map(
                    (id) => assignments.byId[id].stackframe
                  ).filter(
                    (stackframe) => stackframe !== undefined
                  );

                  if(matchFrames.length > 0) //this check isn't *really*
                    //necessary, but may as well prevent stupid stuff
                  {
                    let maxMatch = Math.min(currentDepth,
                      Math.max(...matchFrames));
                    id = stableKeccak256({astId, stackframe: maxMatch});
                  }
                }

                //if we still didn't find it, oh well


                let { ref } = (assignments.byId[id] || {});
                if (!ref) { return undefined };
  
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
          return Object.assign({}, ...keyedResults);
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
