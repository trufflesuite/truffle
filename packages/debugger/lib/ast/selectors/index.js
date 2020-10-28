import debugModule from "debug";
const debug = debugModule("debugger:ast:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";

import solidity from "lib/solidity/selectors";

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
     * let's just flatten this into an array
     */
    sources: createLeaf([solidity.views.sources], sources =>
      Object.values(sources)
    )
  }
});

export default ast;
