import debugModule from "debug";
const debug = debugModule("debugger:data:selectors");

import { createSelectorTree, createLeaf } from "../selectors";

import ast from "../ast/selectors";
import evm from "../evm/selectors";
import context from "../context/selectors";


const data = createSelectorTree({
  /**
   * data.scopes
   */
  scopes: {

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
      ),

      /**
       * data.scopes.current.list
       *
       * scopes map for current context
       */
      list: createLeaf(
        [evm.current.call, context.indexBy, (state) => state.data],

        ({address, binary}, indexBy, data) => {
          let index = address ? indexBy.address[address] : indexBy.binary[binary];
          return data[index];
        }
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
      ["../scopes/current"],

      ({id, list}) => {
        let cur = id;
        let variables = {};

        do {
          variables = Object.assign(
            variables,
            ...(list[cur].variables || [])
              .filter( (v) => variables[v.name] == undefined )
              .map( (v) => ({ [v.name]: list[v.id].pointer }) )
          );

          cur = list[cur].parentId;
        } while (cur != null);

        return variables;
      }
    )
  }
});

export default data;
