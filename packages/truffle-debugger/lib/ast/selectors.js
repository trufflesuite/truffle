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
   * ast.by
   *
   * ast lookups
   */
  by: {
    /**
     * ast.by.index
     *
     * ast for context index
     */
    index: createLeaf(
      [context.list], (list) => list.map( (context) => context.ast )
    ),

    /**
     * ast.by.address
     *
     * ast for context with address
     */
    address: createLeaf(
      [context.by.address],

      (contexts) => ({
        ...Object.assign(
          {},
          ...Object.entries(contexts)
            .map( ([address, context]) => ({ [address]: context.ast }) )
        )
      })
    ),

    /**
     * ast.by.binary
     *
     * ast for context with binary
     */
    binary: createLeaf(
      [context.by.binary],

      (contexts) => ({
        ...Object.assign(
          {},
          ...Object.entries(contexts)
            .map( ([binary, context]) => ({ [binary]: context.ast }) )
        )
      })
    ),
  },

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
