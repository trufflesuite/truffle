import debugModule from "debug";
const debug = debugModule("debugger:stacktrace:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";

import solidity from "lib/solidity/selectors";

import zipWith from "lodash.zipwith";

const identity = x => x;

function createMultistepSelectors(stepSelector) {
  return {
    /**
     * .location
     */
    location: {
      /**
       * .source
       */
      source: createLeaf([stepSelector.source], identity),
      /**
       * .sourceRange
       */
      sourceRange: createLeaf([stepSelector.sourceRange], identity),
      /**
       * .node
       */
      node: createLeaf([stepSelector.node], identity)
    }
  };
}

let stacktrace = createSelectorTree({
  /**
   * stacktrace.state
   */
  state: state => state.stacktrace,

  /**
   * stacktrace.current
   */
  current: {
    /**
     * stacktrace.current.callstack
     */
    callstack: createLeaf(["/state"], state => state.proc.callstack),

    /**
     * stacktrace.current.returnCounter
     */
    returnCounter: createLeaf(["/state"], state => state.proc.returnCounter),

    /**
     * stacktrace.current.markedPosition
     */
    markedPosition: createLeaf(["/state"], state => state.proc.markedPosition),

    /**
     * stacktrace.current.innerReturnPosition
     */
    innerReturnPosition: createLeaf(
      ["/state"],
      state => state.proc.innerReturnPosition
    ),

    /**
     * stacktrace.current.innerReturnStatus
     */
    innerReturnStatus: createLeaf(
      ["/state"],
      state => state.proc.innerReturnStatus
    ),

    /**
     * stacktrace.current.justReturned
     */
    justReturned: createLeaf(["/state"], state => state.proc.justReturned),

    ...createMultistepSelectors(solidity.current),

    /**
     * stacktrace.current.willJumpIn
     */
    willJumpIn: createLeaf(
      [solidity.current.willJump, solidity.current.jumpDirection],
      (willJump, jumpDirection) => willJump && jumpDirection === "i"
    ),

    /**
     * stacktrace.current.willJumpOut
     */
    willJumpOut: createLeaf(
      [solidity.current.willJump, solidity.current.jumpDirection],
      (willJump, jumpDirection) => willJump && jumpDirection === "o"
    ),

    /**
     * stacktrace.current.willCall
     * note: includes creations!
     */
    willCall: createLeaf([solidity.current.willCall], identity),

    /**
     * stacktrace.current.nextFrameIsSkippedInReports
     */
    nextFrameIsSkippedInReports: createLeaf(
      [solidity.current.nextFrameIsPhantom],
      identity
    ),

    /**
     * stacktrace.current.willReturn
     */
    willReturn: createLeaf([solidity.current.willReturn], identity),

    /**
     * stacktrace.current.returnStatus
     */
    returnStatus: createLeaf(
      ["./willReturn", solidity.current.willFail],
      (returns, failing) => (returns ? !failing : null)
    ),

    /**
     * stacktrace.current.positionWillChange
     */
    positionWillChange: createLeaf(
      ["/next/location", "./markedPosition"],
      (nextLocation, markedLocation) =>
        Boolean(markedLocation) && //if there's no marked position, we don't need this check
        Boolean(nextLocation.source) &&
        nextLocation.source.id !== undefined && //if next location is unmapped, we consider ourselves to have not moved
        (nextLocation.source.compilationId !==
          markedLocation.source.compilationId ||
          nextLocation.source.id !== markedLocation.source.id ||
          nextLocation.sourceRange.start !== markedLocation.sourceRange.start ||
          nextLocation.sourceRange.length !== markedLocation.sourceRange.length)
    ),

    /**
     * stacktrace.current.report
     * Contains the report object for outside consumption.
     * Still needs to be processed into a string, mind you.
     */
    report: createLeaf(
      ["./callstack", "./innerReturnPosition", "./innerReturnStatus"],
      (rawStack, finalLocation, status) => {
        //step 1: process skipped frames
        let callstack = [];
        //we're doing a C-style loop here!
        //because we want to skip some items <grin>
        for (let i = 0; i < rawStack.length; i++) {
          const frame = rawStack[i];
          if (
            frame.skippedInReports &&
            i < rawStack.length - 1 &&
            rawStack[i + 1].type === "internal"
          ) {
            const combinedFrame = {
              //only including the relevant info here
              calledFromPosition: frame.calledFromPosition,
              name: rawStack[i + 1].name
            };
            callstack.push(combinedFrame);
            i++; //!! SKIP THE NEXT FRAME!
          } else {
            //ordinary case: just push the frame
            callstack.push(frame);
          }
        }
        debug("callstack: %O", callstack);
        //step 2: shift everything over by 1 and recombine :)
        let locations = callstack.map(frame => frame.calledFromPosition);
        //remove initial null, add final location on end
        locations.shift();
        locations.push(finalLocation);
        debug("locations: %O", locations);
        const names = callstack.map(frame => frame.name);
        debug("names: %O", names);
        let report = zipWith(locations, names, (location, name) => ({
          location,
          name
        }));
        //finally: set the status in the top frame
        report[report.length - 1].status = status;
        return report;
      }
    )
  },

  /**
   * stacktrace.next
   */
  next: {
    ...createMultistepSelectors(solidity.next)
  }
});

export default stacktrace;
