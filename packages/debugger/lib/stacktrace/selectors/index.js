import debugModule from "debug";
const debug = debugModule("debugger:stacktrace:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";

import trace from "lib/trace/selectors";
import evm from "lib/evm/selectors";
import sourcemapping from "lib/sourcemapping/selectors";

import zipWith from "lodash/zipWith";
import { popNWhere } from "lib/helpers";
import * as Codec from "@truffle/codec";

const identity = x => x;

function generateReport(rawStack, location, status, message) {
  //step 1: process combined frames
  let callstack = [];
  //we're doing a C-style loop here!
  //because we want to skip some items <grin>
  for (let i = 0; i < rawStack.length; i++) {
    const frame = rawStack[i];
    if (
      frame.combineWithNextInternal &&
      i < rawStack.length - 1 &&
      rawStack[i + 1].type === "internal" &&
      !rawStack[i + 1].sourceIsInternal
    ) {
      const combinedFrame = {
        ...rawStack[i + 1],
        calledFromLocation: frame.calledFromLocation
        //note: since the next frame is internal, it will have the
        //same address as this, so we don't have to specify which
        //one to take the address from
        //(same with isConstructor)
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
  const names = callstack.map(
    ({ functionName, contractName, address, isConstructor, type }) => ({
      functionName,
      contractName,
      address,
      isConstructor,
      type
    })
  );
  debug("names: %O", names);
  let report = zipWith(locations, names, (location, nameInfo) => ({
    ...nameInfo,
    location
  }));
  //finally: set the status in the top frame
  //and the message in the bottom
  if (status !== null) {
    report[report.length - 1].status = status;
  }
  if (message !== undefined) {
    if (message.Error !== undefined) {
      report[0].message = message.Error;
    } else if (message.Panic !== undefined) {
      report[0].panic = message.Panic;
    } else if (message.custom !== undefined) {
      report[0].custom = message.custom;
    }
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
      node: createLeaf([stepSelector.node], identity),
      /**
       * .pointer
       */
      pointer: createLeaf([stepSelector.pointer], identity)
    },

    /**
     * .sourceIsInternal
     */
    sourceIsInternal: createLeaf(
      ["./location/source"],
      source => source.id === undefined || source.internal
    ),

    /**
     * .sourceIsGenerated
     * only specifically generated sources, not unmapped code or anything!
     */
    sourceIsGenerated: createLeaf(
      ["./location/source"],
      source => source.internal
    ),

    /**
     * .strippedLocation
     */
    strippedLocation: createLeaf(
      ["./location/source", "./location/sourceRange", "./location/node"],
      ({ id, sourcePath, internal }, sourceRange, node) => ({
        source: { id, sourcePath, internal },
        sourceRange,
        node: node ? { id: node.id } : null
      })
    ),

    /**
     * .contractNode
     * WARNING: see the warning in sourcemapping before
     * using this selector!
     */
    contractNode: createLeaf([stepSelector.contractNode], identity)
  };
}

let stacktrace = createSelectorTree({
  /**
   * stacktrace.state
   */
  state: state => state.stacktrace,

  /**
   * stacktrace.transaction
   */
  transaction: {
    /**
     * stacktrace.transaction.initialCallCombinesWithNextJumpIn
     */
    initialCallCombinesWithNextJumpIn: createLeaf(
      [sourcemapping.transaction.bottomStackframeRequiresPhantomFrame],
      identity
    )
  },

  /**
   * stacktrace.current
   */
  current: {
    /**
     * stacktrace.current.callstack (namespace)
     */
    callstack: {
      /**
       * stacktrace.current.callstack (selector)
       */
      _: createLeaf(["/state"], state => state.proc.callstack),

      /**
       * stacktrace.current.callstack.preupdated
       * This selector reflects the callstack as it actually is at the current
       * moment, rather than carrying around additional error information on top
       * in case it turns out to be relevant -- it's been "preupdated" assuming
       * we don't want the error info on top, which in certain cases, we don't.
       */
      preupdated: createLeaf(
        ["./_", "/current/returnCounter"],
        (callstack, returnCounter) =>
          popNWhere(
            callstack,
            returnCounter,
            frame => frame.type === "external"
          )
      )
    },

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

    /**
     * stacktrace.current.innerErrorIndex
     * Index of the most recent error (but not this)
     */
    innerErrorIndex: createLeaf(
      ["/state"],
      state => state.proc.innerErrorIndex
    ),

    ...createMultistepSelectors(sourcemapping.current),

    /**
     * stacktrace.current.index
     */
    index: createLeaf([trace.index], identity),

    /**
     * stacktrace.current.updateIndex
     * We only want to update the index if:
     * 1. the return counter is 0 (we're not in the middle of an
     * error already being thrown -- we want to keep it at the
     * initial index for that error)
     * 2. we're not on the last step (we don't want to accidentally
     * save the final step as the last error, it would be confusing)
     * 3. the return status is actually false
     */
    updateIndex: createLeaf(
      ["./returnCounter", trace.stepsRemaining, "./returnStatus"],
      (returnCounter, stepsRemaining, returnStatus) =>
        returnCounter === 0 && stepsRemaining > 1 && !returnStatus
    ),

    /**
     * stacktrace.current.willJumpIn
     */
    willJumpIn: createLeaf(
      [sourcemapping.current.willJump, sourcemapping.current.jumpDirection],
      (willJump, jumpDirection) => willJump && jumpDirection === "i"
    ),

    /**
     * stacktrace.current.willJumpOut
     */
    willJumpOut: createLeaf(
      [sourcemapping.current.willJump, sourcemapping.current.jumpDirection],
      (willJump, jumpDirection) => willJump && jumpDirection === "o"
    ),

    /**
     * stacktrace.current.willCall
     * note: includes creations!
     */
    willCall: createLeaf([sourcemapping.current.willCall], identity),

    /**
     * stacktrace.current.context
     */
    context: createLeaf([evm.current.context], identity),

    /**
     * stacktrace.current.callContext
     */
    callContext: createLeaf([evm.current.step.callContext], identity),

    /**
     * stacktrace.current.callCombinesWithNextJumpIn
     */
    callCombinesWithNextJumpIn: createLeaf(
      [sourcemapping.current.callRequiresPhantomFrame],
      identity
    ),

    /**
     * stacktrace.current.willReturn
     */
    willReturn: createLeaf([sourcemapping.current.willReturn], identity),

    /**
     * stacktrace.current.returnStatus
     */
    returnStatus: createLeaf([evm.current.step.returnStatus], identity),

    /**
     * stacktrace.current.address
     * Initial call can't be a delegate, so we just use the storage address
     * (thus allowing us to handle both calls & creates in one)
     */
    address: createLeaf([evm.current.call], call => call.storageAddress),

    /**
     * stacktrace.current.callAddress
     *
     * Covers both calls and creates
     * NOTE: for this selector, we treat delegates just like any other call!
     * we want to report the *code* address here, not the storage address
     * (exception: for creates we report the storage address, as that's where
     * the code *will* live)
     */
    callAddress: createLeaf(
      [
        evm.current.step.isCall,
        evm.current.step.isCreate,
        evm.current.step.callAddress,
        evm.current.step.createdAddress
      ],
      (isCall, isCreate, callAddress, createdAddress) => {
        if (isCall) {
          return callAddress;
        } else if (isCreate) {
          if (createdAddress !== Codec.Evm.Utils.ZERO_ADDRESS) {
            return createdAddress;
          } else {
            return undefined; //if created address appears to be 0, omit it
          }
        } else {
          return null; //I guess??
        }
      }
    ),

    /**
     * stacktrace.current.revertString
     * Crudely decodes the current revert string, OR the current panic,
     * *or* an indication of a custom error (but not what, we can't do
     * that here)
     * Returns { Error: <string> } or { Panic: <BN> } or { custom: true }
     * (or undefined)
     * Not meant to account for crazy things, just there to produce
     * a simple string or number.
     * NOTE: if panic code is overlarge, we'll use -1 instead to indicate
     * an unknown type of panic.
     */
    revertString: createLeaf(
      [evm.current.step.returnValue],
      rawRevertMessage => {
        let revertDecodings = Codec.decodeRevert(
          Codec.Conversion.toBytes(rawRevertMessage)
        );
        if (
          revertDecodings.length === 1 &&
          revertDecodings[0].kind === "revert"
        ) {
          const decoding = revertDecodings[0];
          switch (decoding.abi.name) {
            case "Error":
              const revertStringInfo = decoding.arguments[0].value.value;
              return {
                Error:
                  Codec.Export.stringValueInfoToStringLossy(revertStringInfo)
              };
            case "Panic":
              const panicCode = decoding.arguments[0].value.value.asBN;
              return { Panic: panicCode };
            default:
              return undefined;
          }
        } else if (revertDecodings.length === 0) {
          return { custom: true };
        } else {
          return undefined;
        }
      }
    ),

    /**
     * stacktrace.current.positionWillChange
     * note: we disregard internal sources here!
     */
    positionWillChange: createLeaf(
      ["/next/location", "/current/location", "./lastPosition"],
      (nextLocation, currentLocation, lastLocation) => {
        let oldLocation =
          currentLocation.source.id !== undefined &&
          !currentLocation.source.internal
            ? currentLocation
            : lastLocation;
        return (
          Boolean(oldLocation) && //if there's no current or last position, we don't need this check
          Boolean(nextLocation.source) &&
          nextLocation.source.id !== undefined && //if next location is unmapped, we consider ourselves to have not moved
          !nextLocation.source.internal && //similarly if it's internal
          (nextLocation.source.id !== oldLocation.source.id ||
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
      [
        "./callstack",
        "./innerReturnPosition",
        "./innerReturnStatus",
        "./revertString"
      ],
      generateReport
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
        "./callstack/preupdated",
        "./returnCounter",
        "./lastPosition",
        "/current/strippedLocation"
      ],
      (callstack, returnCounter, lastPosition, currentLocation) =>
        generateReport(
          callstack,
          currentLocation || lastPosition,
          null,
          undefined
        )
    )
  },

  /**
   * stacktrace.next
   */
  next: {
    ...createMultistepSelectors(sourcemapping.next)
  }
});

export default stacktrace;
