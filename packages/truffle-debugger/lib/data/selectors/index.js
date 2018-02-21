import debugModule from "debug";
const debug = debugModule("debugger:data:selectors");

import { createSelectorTree, createLeaf } from "lib/selectors";
import jsonpointer from "json-pointer";

import ast from "lib/ast/selectors";
import evm from "lib/evm/selectors";
import context from "lib/context/selectors";

import decode from "../decode";

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
        evm.next.state
      ],

      (list, id, tree, state) => {
        let cur = id;
        let variables = {};

        const format = (v) => {
          let {stack} = state;

          if (stack && v.stackIndex >= 0 && v.stackIndex < stack.length) {
            let definition = jsonpointer.get(tree, v.pointer);
            return decode(definition, v.stackIndex, state);
          }

          return null;
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
    )
  }
});

export default data;
