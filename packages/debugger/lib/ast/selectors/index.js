import debugModule from "debug";
const debug = debugModule("debugger:ast:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";

import sourcemapping from "lib/sourcemapping/selectors";

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
    sources: createLeaf([sourcemapping.views.sources], sources =>
      Object.values(sources)
    )
  }
});

export default ast;
