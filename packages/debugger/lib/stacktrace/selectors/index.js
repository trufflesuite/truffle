import debugModule from "debug";
const debug = debugModule("debugger:stacktrace:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";

import solidity from "lib/solidity/selectors";

import zipWith from "lodash.zipwith";
import { popNWhere } from "lib/helpers";

const identity = x => x;

function generateReport(rawStack, location, status) {
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
        calledFromLocation: frame.calledFromLocation,
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
  let locations = callstack.map(frame => frame.calledFromLocation);
  //remove initial null, add final location on end
  locations.shift();
  locations.push(location);
  debug("locations: %O", locations);
  const names = callstack.map(frame => frame.name);
  debug("names: %O", names);
  let report = zipWith(locations, names, (location, name) => ({
    location,
    name
  }));
  //finally: set the status in the top frame
  if (status !== null) {
    report[report.length - 1].status = status;
  }
  return report;
}

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
    },

    /**
     * .strippedLocation
     */
    strippedLocation: createLeaf(
      ["./location/source", "./location/sourceRange"],
      ({ id, compilationId, sourcePath }, sourceRange) => ({
        source: { id, compilationId, sourcePath },
        sourceRange
      })
    )
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
     * stacktrace.current.lastPosition
     */
    lastPosition: createLeaf(["/state"], state => state.proc.lastPosition),

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
      [solidity.current.callRequiresPhantomFrame],
      identity
    ),

    /**
     * stacktrace.current.willReturn
     */
    willReturn: createLeaf([solidity.current.willReturn], identity),

    /**
     * stacktrace.current.willFail
     */
    willFail: createLeaf([solidity.current.willFail], identity),

    /**
     * stacktrace.current.willReturnOrFail
     */
    willReturnOrFail: createLeaf(
      ["./willReturn", "./willFail"],
      (willReturn, willFail) => willReturn || willFail
    ),

    /**
     * stacktrace.current.returnStatus
     */
    returnStatus: createLeaf(["./willReturn", "./willFail"], (returns, fails) =>
      returns ? true : fails ? false : null
    ),

    /**
     * stacktrace.current.positionWillChange
     */
    positionWillChange: createLeaf(
      ["/next/location", "/current/location", "./lastPosition"],
      (nextLocation, currentLocation, lastLocation) => {
        let oldLocation =
          currentLocation.source.id !== undefined
            ? currentLocation
            : lastLocation;
        return (
          Boolean(oldLocation) && //if there's no current or last position, we don't need this check
          Boolean(nextLocation.source) &&
          nextLocation.source.id !== undefined && //if next location is unmapped, we consider ourselves to have not moved
          (nextLocation.source.compilationId !==
            oldLocation.source.compilationId ||
            nextLocation.source.id !== oldLocation.source.id ||
            nextLocation.sourceRange.start !== oldLocation.sourceRange.start ||
            nextLocation.sourceRange.length !== oldLocation.sourceRange.length)
        );
      }
    ),

    /**
     * stacktrace.current.finalReport
     * Contains the report object for outside consumption.
     * Still needs to be processed into a string, mind you.
     */
    finalReport: createLeaf(
      ["./callstack", "./innerReturnPosition", "./innerReturnStatus"],
      (callstack, finalLocation, status) =>
        generateReport(callstack, finalLocation, status)
    ),

    /**
     * stacktrace.current.report
     * Similar to stacktrace.current.report, but meant for use as at
     * an intermediate point instead of at the end (it reflects how things
     * actually currently are rather than taking into account exited
     * stackframes that caused the revert)
     */
    report: createLeaf(
      [
        "./callstack",
        "./returnCounter",
        "./lastPosition",
        "/current/strippedLocation"
      ],
      (callstack, returnCounter, lastPosition, currentLocation) =>
        generateReport(
          popNWhere(
            callstack,
            returnCounter,
            frame => frame.type === "external"
          ),
          currentLocation || lastPosition,
          null
        )
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
