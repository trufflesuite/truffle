import debugModule from "debug";
const debug = debugModule("debugger:ast:selectors");

import { createSelectorTree, createLeaf } from "../selectors";
import jsonpointer from "json-pointer";

import context from "../context/selectors";
import solidity from "../solidity/selectors";

import { findRange } from "./map";


const selector = createSelectorTree({
  /**
   * ast.current
   *
   * ast for current context
   */
  current: createLeaf(
    [context.current], (context) => context.ast
  ),

  /**
   * ast.next
   */
  next: {
    /**
     * ast.next.pointer
     *
     * jsonpointer for next ast node
     */
    pointer: createLeaf(
      ["../current", solidity.nextStep.sourceRange], (ast, range) =>
        findRange(ast, range.start, range.length)
    ),

    /**
     * ast.next.node
     *
     * next ast node to execute
     */
    node: createLeaf(
      ["../current", "./pointer"], (ast, pointer) =>
        jsonpointer.get(ast, pointer)
    ),

  }
});

export default selector;
