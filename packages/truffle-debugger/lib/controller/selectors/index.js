import debugModule from "debug";
const debug = debugModule("debugger:controller:sagas"); //eslint-disable-line no-unused-vars

import { createSelectorTree, createLeaf } from "reselect-tree";

import evm from "lib/evm/selectors";
import solidity from "lib/solidity/selectors";
import trace from "lib/trace/selectors";

/**
 * @private
 */
const identity = x => x;

/**
 * controller
 */
const controller = createSelectorTree({
  /**
   * controller.state
   */
  state: state => state.controller,
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
       * controller.current.location.source
       */
      source: createLeaf([solidity.current.source], identity),

      /**
       * controller.current.location.node
       */
      node: createLeaf([solidity.current.node], identity),

      /**
       * controller.current.location.isMultiline
       */
      isMultiline: createLeaf([solidity.current.isMultiline], identity)
    }
  },

  /**
   * controller.breakpoints
   */
  breakpoints: createLeaf(["./state"], state => state.breakpoints),

  /**
   * controller.isStepping
   */
  isStepping: createLeaf(["./state"], state => state.isStepping),

  /**
   * controller.finished
   */
  finished: createLeaf([trace.finished], identity)
});

export default controller;
