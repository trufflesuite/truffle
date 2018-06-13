import debugModule from "debug";
const debug = debugModule("debugger:data:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";
import jsonpointer from "json-pointer";

import ast from "lib/ast/selectors";
import evm from "lib/evm/selectors";
import solidity from "lib/solidity/selectors";

import decode from "../decode";
import * as decodeUtils from "../decode/utils";

import { BigNumber } from "bignumber.js";

function createStateSelectors({ stack, memory, storage }) {
  return {
    /**
     * .stack
     */
    stack: createLeaf(
      [stack],

      (words) => (words || []).map(
        (word) => decodeUtils.toBytes(decodeUtils.toBigNumber(word, decodeUtils.WORD_SIZE))
      )
    ),

    /**
     * .memory
     */
    memory: createLeaf(
      [memory],

      (words) => new Uint8Array(
        (words.join("").match(/.{1,2}/g) || [])
          .map( (byte) => parseInt(byte, 16) )
      )
    ),

    /**
     * .storage
     */
    storage: createLeaf(
      [storage],

      (mapping) => Object.assign(
        {}, ...Object.entries(mapping).map( ([ address, word ]) =>
          ({
            [`0x${address}`]: new Uint8Array(
              (word.match(/.{1,2}/g) || [])
                .map( (byte) => parseInt(byte, 16) )
            )
          })
        )
      )
    )
  };
}

const data = createSelectorTree({
  state: (state) => state.data,

  /**
   * data.views
   */
  views: {
    ast: createLeaf(
      [ast.current], (tree) => tree
    ),

    atLastInstructionForSourceRange: createLeaf(
      [solidity.current.isSourceRangeFinal], (final) => final
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

        (scopes, sources) => Object.assign({},
          ...Object.entries(scopes).map(
            ([id, entry]) => ({
              [id]: {
                ...entry,

                definition: jsonpointer.get(
                  sources[entry.sourceId].ast, entry.pointer
                )
              }
            })
          )
        )
      )
    },

    /**
     * data.views.decoder
     *
     * selector returns (ast node definition, data reference) => value
     */
    decoder: createLeaf(
      ["/views/scopes/inlined", "/current/state"],

      (scopes, state) => {
        return (definition, ref) => decode(definition, ref, state, scopes)
      }
    )
  },

  /**
   * data.info
   */
  info: {

    /**
     * data.info.scopes
     */
    scopes: createLeaf(["/state"], (state) => state.info.scopes.byId)
  },

  /**
   * data.proc
   */
  proc: {

    /**
     * data.proc.assignments
     */
    assignments: createLeaf(["/state"], (state) => state.proc.assignments.byId)
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
      id: createLeaf(
        [ast.current.node], (node) => node.id
      )
    },

    /**
     * data.current.state
     */
    state: createStateSelectors(evm.current.state),

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
        [
          "/views/scopes/inlined",
          "/current/scope",
        ],

        (scopes, scope) => {
          let cur = scope.id;
          let variables = {};

          do {
            variables = Object.assign(
              variables,
              ...(scopes[cur].variables || [])
                .filter( (v) => variables[v.name] == undefined )
                .map( (v) => ({ [v.name]: v.id }) )
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
        [
          "/views/scopes/inlined",
          "./_"
        ],

        (scopes, identifiers) => Object.assign({},
          ...Object.entries(identifiers)
            .map( ([identifier, id]) => {
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
          "./_"
        ],

        (assignments, identifiers) => Object.assign({},
          ...Object.entries(identifiers)
            .map( ([identifier, id]) => {
              let { ref } = (assignments[id] || {})
              if (!ref) { return undefined };

              return {
                [identifier]: ref
              };
            })
        )
      ),

      decoded: createLeaf(
        [
          "/views/decoder",
          "./definitions",
          "./refs",
        ],

        (decode, definitions, refs) => Object.assign({},
          ...Object.entries(refs)
            .map( ([identifier, ref]) => ({
              [identifier]: decode(definitions[identifier], ref)
            }) )
        )
      ),

      native: createLeaf(['./decoded'], decodeUtils.cleanBigNumbers)
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
