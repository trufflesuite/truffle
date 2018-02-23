import debugModule from "debug";
const debug = debugModule("debugger:data:selectors");

import { createSelectorTree, createLeaf } from "lib/selectors";
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

  } else if (typeof value == "object") {
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
       * data.scopes.table.current
       *
       * scopes map for current context
       */
      current: createLeaf(
        [evm.current.call, context.indexBy, (state) => state.data],

        ({address, binary}, indexBy, data) => {
          let index = address ? indexBy.address[address] : indexBy.binary[binary];
          return data[index];
        }
      )
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

      (words) => words.map( (word) => new Uint8Array(
        (word.match(/.{1,2}/g) || [])
          .map( (byte) => parseInt(byte, 16) )
      ))
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
     * map of current identifiers to declaration AST node id
     */
    current: createLeaf(
      [
        "/scopes/tables/current",
        "/scopes/current/id",
        ast.current.tree,
        "/current"
      ],

      (list, id, tree, state) => {
        let cur = id;
        let variables = {};

        const format = (v) => {
          let {stack, memory, storage} = state;
          let definition = jsonpointer.get(tree, v.pointer);
          var rawValue;

          debug("v.ref: %o", v.ref);
          if (!v.ref) {
            return undefined;
          }

          if (v.ref.stack != undefined && stack && v.ref.stack < stack.length) {
            rawValue = stack[v.ref.stack];
          } else if (v.ref.storage != undefined) {
            let key = decodeUtils.toHexString(
              decodeUtils.toBytes(v.ref.storage), 0x20
            );
            rawValue = storage[key];
          }

          if (rawValue != undefined) {
            return decode(definition, rawValue, state, list);
          }
        };

        do {
          variables = Object.assign(
            variables,
            ...(list[cur].variables || [])
              .filter( (v) => variables[v.name] == undefined )
              .map( (v) => ({ [v.name]: format(list[v.id]) }) )
          );

          cur = list[cur].parentId;
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
