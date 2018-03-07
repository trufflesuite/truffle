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
    executionContext: createLeaf([evm.current.call], identity)
  },

  /**
   * controller.next
   */
  next: {

    /**
     * controller.next.willJump
     */
    willJump: createLeaf([evm.next.step.isJump], identity),

    /**
     * controller.next.location
     */
    location: {
      /**
       * controller.next.location.sourceRange
       */
      sourceRange: createLeaf([solidity.next.sourceRange], identity),

      /**
       * controller.next.location.node
       */
      node: createLeaf([ast.next.node], identity),

      /**
       * controller.next.location.isMultiline
       */
      isMultiline: createLeaf([solidity.next.isMultiline], identity),
    }
  }
});

export default controller;
