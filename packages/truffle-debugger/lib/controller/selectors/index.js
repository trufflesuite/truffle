import debugModule from "debug";
const debug = debugModule("debugger:controller:selectors"); //eslint-disable-line no-unused-vars

import { createSelectorTree, createLeaf } from "reselect-tree";

import evm from "lib/evm/selectors";
import solidity from "lib/solidity/selectors";
import trace from "lib/trace/selectors";

import { anyNonSkippedInRange } from "lib/ast/map";

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
      sourceRange: createLeaf(
        [solidity.current.sourceRange, "/current/trace/loaded"],
        (range, loaded) => (loaded ? range : null)
      ),

      /**
       * controller.current.location.source
       */
      source: createLeaf(
        [solidity.current.source, "/current/trace/loaded"],
        (source, loaded) => (loaded ? source : null)
      ),

      /**
       * controller.current.location.node
       */
      node: createLeaf(
        [solidity.current.node, "/current/trace/loaded"],
        (node, loaded) => (loaded ? node : null)
      ),

      /**
       * controller.current.location.isMultiline
       */
      isMultiline: createLeaf(
        [solidity.current.isMultiline, "/current/trace/loaded"],
        (raw, loaded) => (loaded ? raw : false)
      )
    },

    /*
     * controller.current.trace
     */
    trace: {
      /**
       * controller.current.trace.finished
       */
      finished: createLeaf([trace.finished], identity),

      /**
       * controller.current.trace.loaded
       */
      loaded: createLeaf([trace.loaded], identity)
    }
  },

  /**
   * controller.breakpoints (namespace)
   */
  breakpoints: {
    /**
     * controller.breakpoints (selector)
     */
    _: createLeaf(["/state"], state => state.breakpoints),

    /**
     * controller.breakpoints.resolver (selector)
     * this selector returns a function that adjusts a given line-based
     * breakpoint (on node-based breakpoints it simply returns the input) by
     * repeatedly moving it down a line until it lands on a line where there's
     * actually somewhere to break.  if no such line exists beyond that point, it
     * returns null instead.
     */
    resolver: createLeaf([solidity.info.sources], sources => breakpoint => {
      let adjustedBreakpoint;
      if (breakpoint.node === undefined) {
        let line = breakpoint.line;
        let { source, ast } = sources[breakpoint.sourceId];
        let lineLengths = source.split("\n").map(line => line.length);
        //why does neither JS nor lodash have a scan function like Haskell??
        //guess we'll have to do our scan manually
        let lineStarts = [0];
        for (let length of lineLengths) {
          lineStarts.push(lineStarts[lineStarts.length - 1] + length + 1);
          //+1 for the /n itself
        }
        debug(
          "line: %s",
          source.slice(lineStarts[line], lineStarts[line] + lineLengths[line])
        );
        while (
          line < lineLengths.length &&
          !anyNonSkippedInRange(ast, lineStarts[line], lineLengths[line])
        ) {
          debug("incrementing");
          line++;
        }
        if (line >= lineLengths.length) {
          adjustedBreakpoint = null;
        } else {
          adjustedBreakpoint = { ...breakpoint, line };
        }
      } else {
        debug("node-based breakpoint");
        adjustedBreakpoint = breakpoint;
      }
      return adjustedBreakpoint;
    })
  },

  /**
   * controller.finished
   * deprecated alias for controller.current.trace.finished
   */
  finished: createLeaf(["/current/finished"], finished => finished),

  /**
   * controller.isStepping
   */
  isStepping: createLeaf(["./state"], state => state.isStepping)
});

export default controller;
