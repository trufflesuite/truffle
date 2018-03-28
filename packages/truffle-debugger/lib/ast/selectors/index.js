import debugModule from "debug";
const debug = debugModule("debugger:ast:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";
import jsonpointer from "json-pointer";

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
     * ast.views.sources
     */
    sources: createLeaf([solidity.info.sources], sources => sources)
  },

  /**
   * ast.current
   */
  current: {

    /**
     * ast.current.tree
     *
     * ast for current source
     */
    tree: createLeaf(
      [solidity.next.source], ({ast}) => ast
    ),

    /**
     * ast.current.index
     *
     * source ID
     */
    index: createLeaf(
      [solidity.next.source], ({id}) => id
    )
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
