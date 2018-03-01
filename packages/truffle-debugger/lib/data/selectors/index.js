import debugModule from "debug";
const debug = debugModule("debugger:data:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";
import jsonpointer from "json-pointer";

import ast from "lib/ast/selectors";
import evm from "lib/evm/selectors";
import context from "lib/context/selectors";

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
  /**
   * data.scopes
   */
  scopes: {

    /**
     * data.scopes.tables
     */
    tables: {

      /**
       * data.scopes.tables.current
       *
       * scopes map for current context
       */
      current: createLeaf(
        [evm.current.call, context.indexBy, (state) => state.data],

        ({address, binary}, indexBy, data) => {
          let index = address ? indexBy.address[address] : indexBy.binary[binary];
          return data[index];
        }
      ),

      inlined: {
        /**
         * data.scopes.tables.inlined.current
         *
         * current scope table with inlined AST nodes
         */
        current: createLeaf(
          ["/scopes/tables/current", ast.current.tree],

          (table, tree) => Object.assign(
            {}, ...Object.entries(table).map(
              ([id, entry]) => ({
                [id]: {
                  ...entry,

                  definition: jsonpointer.get(tree, entry.pointer)
                }
              })
            )
          )
        )
      }
    },

    /**
     * data.scopes.current
     */
    current: {

      /**
       * data.scopes.current.id
       *
       * data scope for current operation
       */
      id: createLeaf(
        [ast.next.node], (node) => node.id
      )
    }
  },

  current: {
    stack: createLeaf(
      [evm.next.state.stack],

      (words) => words.map(
        (word) => decodeUtils.toBytes(decodeUtils.toBigNumber(word, decodeUtils.WORD_SIZE))
      )
    ),

    memory: createLeaf(
      [evm.next.state.memory],

      (words) => new Uint8Array(
        (words.join("").match(/.{1,2}/g) || [])
          .map( (byte) => parseInt(byte, 16) )
      )
    ),

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
        "/scopes/tables/inlined/current",
        "/scopes/current/id",
        "/current"
      ],

      (refs, id, state) => {
        let cur = id;
        let variables = {};


        const format = (v) => {
          let {stack, memory, storage} = state;
          let definition = v.definition;
          var rawValue;

          debug("v.ref: %o", v.ref);
          if (!v.ref) {
            return undefined;
          }

          return decode(definition, v.ref, state, refs);
        };

        do {
          variables = Object.assign(
            variables,
            ...(refs[cur].variables || [])
              .filter( (v) => variables[v.name] == undefined )
              .map( (v) => ({ [v.name]: format(refs[v.id]) }) )
          );

          cur = refs[cur].parentId;
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
