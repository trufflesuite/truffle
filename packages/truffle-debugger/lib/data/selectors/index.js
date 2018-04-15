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

function cleanBigNumbers(value) {
  if (BigNumber.isBigNumber(value)) {
    return value.toNumber();

  } else if (value && value.map != undefined) {
    return value.map( (inner) => cleanBigNumbers(inner) );

  } else if (value && typeof value == "object") {
    return Object.assign(
      {}, ...Object.entries(value)
        .map( ([key, inner]) => ({ [key]: cleanBigNumbers(inner) }) )
    );

  } else {
    return value;
  }
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
    }
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
  },

  /**
   * data.next
   */
  next: {

    /**
     * data.next.stack
     */
    stack: createLeaf(
      [evm.next.state.stack],

      (words) => (words || []).map(
        (word) => decodeUtils.toBytes(decodeUtils.toBigNumber(word, decodeUtils.WORD_SIZE))
      )
    ),

    /**
     * data.next.memory
     */
    memory: createLeaf(
      [evm.next.state.memory],

      (words) => new Uint8Array(
        (words.join("").match(/.{1,2}/g) || [])
          .map( (byte) => parseInt(byte, 16) )
      )
    ),

    /**
     * data.next.storage
     */
    storage: createLeaf(
      [evm.next.state.storage],

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

  },

  /**
   * data.identifiers
   */
  identifiers: {

    /**
     * data.identifiers.current
     *
     * map of current identifiers to precise value
     */
    current: createLeaf(
      [
        "/views/scopes/inlined",
        "/proc/assignments",
        "/current/scope",
        "/next"
      ],

      (scopes, assignments, scope, next) => {
        let { stack, memory, storage } = next;
        let cur = scope.id;
        let variables = {};


        const format = (v) => {
          let definition = v.definition;
          debug("assignments %O", assignments);
          debug("v.id %o", v.id);
          let assignment = (assignments[v.id] || {}).ref;
          var rawValue;

          debug("assignment: %o", assignment);
          if (!assignment) {
            return undefined;
          }

          return decode(definition, assignment, next, scopes);
        };

        do {
          variables = Object.assign(
            variables,
            ...(scopes[cur].variables || [])
              .filter( (v) => variables[v.name] == undefined )
              .map( (v) => ({ [v.name]: format(scopes[v.id]) }) )
          );

          cur = scopes[cur].parentId;
        } while (cur != null);

        return variables;
      }
    ),

    /**
     * data.identifiers.native.current
     *
     * stripped of bignumbers
     */
    native: {
      current: createLeaf(['/identifiers/current'], cleanBigNumbers)
    }
  }
});

export default data;
