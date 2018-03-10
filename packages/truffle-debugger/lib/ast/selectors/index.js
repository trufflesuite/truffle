import debugModule from "debug";
const debug = debugModule("debugger:ast:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";
import jsonpointer from "json-pointer";

import context from "lib/context/selectors";
import solidity from "lib/solidity/selectors";

import { findRange } from "../map";


/**
 * ast
 */
const ast = createSelectorTree({
  /**
   * ast.views
   */
  views: {
    /**
     * ast.views.contexts
     */
    contexts: createLeaf([context.list], cs => cs)
  },

  /**
   * ast.current
   */
  current: {

    /**
     * ast.current.tree
     *
     * ast for current context
     */
    tree: createLeaf(
      [context.current], (context) => context.ast
    ),

    /**
     * ast.current.index
     *
     * index in context list
     */
    index: createLeaf(
      [context.current, context.indexBy.binary], (context, indexBy) =>
        indexBy(context.binary)
    )
  },

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
      ["/current/tree", solidity.next.sourceRange], (ast, range) =>
        findRange(ast, range.start, range.length)
    ),

    /**
     * ast.next.node
     *
     * next ast node to execute
     */
    node: createLeaf(
      ["/current/tree", "./pointer"], (ast, pointer) =>
        jsonpointer.get(ast, pointer)
    ),

  }
});

export default ast;
