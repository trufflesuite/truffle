import debugModule from "debug";
const debug = debugModule("debugger:controller:sagas");

import { createSelectorTree, createLeaf } from "reselect-tree";

import evm from "lib/evm/selectors";
import solidity from "lib/solidity/selectors";
import ast from "lib/ast/selectors";

/**
 * @private
 */
const identity = (x) => x

/**
 * controller
 */
const controller = createSelectorTree({

  /**
   * controller.current
   */
  current: {
    /**
     * controller.current.functionDepth
     */
    functionDepth: createLeaf([solidity.current.functionDepth], identity),

    /**
     * controller.current.executionContext
     */
    executionContext: createLeaf([evm.current.call], identity),

    /**
     * controller.current.willJump
     */
    willJump: createLeaf([evm.current.step.isJump], identity),

    /**
     * controller.current.location
     */
    location: {
      /**
       * controller.current.location.sourceRange
       */
      sourceRange: createLeaf([solidity.current.sourceRange], identity),

      /**
       * controller.current.location.node
       */
      node: createLeaf([ast.current.node], identity),

      /**
       * controller.current.location.isMultiline
       */
      isMultiline: createLeaf([solidity.current.isMultiline], identity),
    }
  }
});

export default controller;
