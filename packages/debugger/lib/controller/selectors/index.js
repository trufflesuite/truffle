import debugModule from "debug";
const debug = debugModule("debugger:controller:selectors"); //eslint-disable-line no-unused-vars

import { createSelectorTree, createLeaf } from "reselect-tree";
import { isSkippedNodeType } from "lib/helpers";
import * as Codec from "@truffle/codec";

import evm from "lib/evm/selectors";
import sourcemapping from "lib/sourcemapping/selectors";
import data from "lib/data/selectors";
import trace from "lib/trace/selectors";

/**
 * @private
 */
const identity = x => x;

function anyNonSkippedInRange(
  findOverlappingRange,
  node,
  sourceStart,
  sourceLength
) {
  let sourceEnd = sourceStart + sourceLength;
  return findOverlappingRange(sourceStart, sourceLength).some(
    ({ range, node }) =>
      isOldStyleAssembly(node) ||
      (sourceStart <= range[0] && //we want to go by starting line
        range[0] < sourceEnd &&
        !isSkippedNodeType(node))
    //NOTE: this doesn't actually catch everything skipped!  But doing better
    //is hard
  );
}

//catches InlineAssembly nodes from before 0.6.0.
//We want to be able to place breakpoints if something merely *overlaps*
//one of these, because, well, we can't really look inside and do better.
function isOldStyleAssembly(node) {
  return node.nodeType === "InlineAssembly" && !node.AST;
}

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
    functionDepth: createLeaf([sourcemapping.current.functionDepth], identity),

    /**
     * controller.current.executionContext
     */
    executionContext: createLeaf([evm.current.call], identity),

    /**
     * controller.current.willJump
     */
    willJump: createLeaf([evm.current.step.isJump], identity),

    /**
     * controller.current.onBaseConstructorDefinition
     */
    onBaseConstructorDefinition: createLeaf(
      [
        "./location/node",
        evm.current.context,
        sourcemapping.current.contractNode
      ],
      (node, context, contract) =>
        node &&
        node.nodeType === "FunctionDefinition" &&
        Codec.Ast.Utils.functionKind(node) === "constructor" &&
        context.contractId !== contract.id //when are we on a *base* constructor
      //definition?  precisely when the contract we're in according to the source
      //mapping is different from the contract whose bytecode is executing
      //(note that we don't need to check whether the compilation IDs are different,
      //since these will always be the same)
    ),

    /**
     * controller.current.location.onYulFunctionDefinitionWhileEntering
     */
    onYulFunctionDefinitionWhileEntering: createLeaf(
      [sourcemapping.current.onYulFunctionDefinitionWhileEntering],
      identity
    ),

    /**
     * controller.current.location
     */
    location: {
      /**
       * controller.current.location.sourceRange
       */
      sourceRange: createLeaf(
        [sourcemapping.current.sourceRange, "/current/trace/loaded"],
        (range, loaded) => (loaded ? range : null)
      ),

      /**
       * controller.current.location.source
       */
      source: createLeaf(
        [sourcemapping.current.source, "/current/trace/loaded"],
        (source, loaded) => (loaded ? source : null)
      ),

      /**
       * controller.current.location.node
       */
      node: createLeaf(
        [sourcemapping.current.node, "/current/trace/loaded"],
        (node, loaded) => (loaded ? node : null)
      ),

      /**
       * controller.current.location.astRef
       */
      astRef: createLeaf([data.current.astRef], identity),

      /**
       * controller.current.location.isMultiline
       */
      isMultiline: createLeaf(
        [sourcemapping.current.isMultiline, "/current/trace/loaded"],
        (raw, loaded) => (loaded ? raw : false)
      )
    },

    /**
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
    resolver: createLeaf(
      [sourcemapping.views.sources, sourcemapping.views.overlapFunctions],
      (sources, functions) => breakpoint => {
        let adjustedBreakpoint;
        if (breakpoint.node === undefined) {
          let line = breakpoint.line;
          if (line < 0) {
            line = 0; //prevents hang if user enters large negative number
          }
          const { sourceId } = breakpoint;
          debug("breakpoint: %O", breakpoint);
          debug("sources: %o", sources);
          const { source, ast } = sources[sourceId];
          if (!ast) {
            //if no ast, don't attempt to adjust
            return breakpoint;
          }
          const findOverlappingRange = functions[sourceId];
          const lineLengths = source.split("\n").map(line => line.length);
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
            !anyNonSkippedInRange(
              findOverlappingRange,
              ast,
              lineStarts[line],
              lineLengths[line]
            )
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
      }
    )
  },

  /**
   * controller.finished
   * deprecated alias for controller.current.trace.finished
   */
  finished: createLeaf(["/current/trace/finished"], finished => finished),

  /**
   * controller.isStepping
   */
  isStepping: createLeaf(["./state"], state => state.isStepping),

  /**
   * controller.stepIntoInternalSources
   */
  stepIntoInternalSources: createLeaf(
    ["./state"],
    state => state.stepIntoInternalSources
  )
});

export default controller;
