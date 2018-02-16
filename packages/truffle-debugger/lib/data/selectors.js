import debugModule from "debug";
const debug = debugModule("debugger:data:selectors");

import { createSelector } from "reselect";
import { createNestedSelector } from "../selectors";

import ast from "../ast/selectors";
import evm from "../evm/selectors";
import context from "../context/selectors";

const data = (state) => state.data;

const currentScopeId = createSelector(
  [ast.next.node],

  (node) => node.id
);

const currentScopeList = createSelector(
  [evm.current.call, context.indexBy, data],

  ({address, binary}, indexBy, data) => {
    let index = address ? indexBy.address[address] : indexBy.binary[binary];
    return data[index];
  }
)

const currentScope = createNestedSelector({
  id: currentScopeId,
  list: currentScopeList
});

const scopes = createNestedSelector({
  current: currentScope,
});

const currentIdentifiers = createSelector(
  [scopes.current],

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
);

const identifiers = createNestedSelector({
  current: currentIdentifiers,
});

const selector = createNestedSelector({
  scopes,
  identifiers
});

export default selector;
