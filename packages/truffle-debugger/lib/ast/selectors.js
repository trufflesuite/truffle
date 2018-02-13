import debugModule from "debug";
const debug = debugModule("debugger:ast:selectors");

import { createSelector } from "reselect";
import { createNestedSelector } from "../selectors";
import jsonpointer from "json-pointer";

import context from "../context/selectors";
import solidity from "../solidity/selectors";

import { findRange } from "./map";

const current = createSelector(
  [context.current],

  (context) => context.ast
);

const pointer = createSelector(
  [current, solidity.nextStep.sourceRange],

  (ast, range) => findRange(ast, range.start, range.length)
);

const node = createSelector(
  [current, pointer],

  (ast, pointer) => jsonpointer.get(ast, pointer)
);


const next = createNestedSelector({
  node,
  pointer
});

const selector = createNestedSelector({
  current,
  next
});

export default selector;
