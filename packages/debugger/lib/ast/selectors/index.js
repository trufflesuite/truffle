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
     */
    sources: createLeaf([solidity.info.sources], sources => sources)
  }
});

export default ast;
