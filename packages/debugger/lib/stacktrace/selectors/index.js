import debugModule from "debug";
const debug = debugModule("debugger:stacktrace:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";

import evm from "lib/evm/selectors";
import solidity from "lib/solidity/selectors";

import jsonpointer from "json-pointer";
import zipWith from "lodash.zipwith";
import { popNWhere } from "lib/helpers";
import * as Codec from "@truffle/codec";

const identity = x => x;

function generateReport(callstack, location, status, message) {
  //step 1: shift everything over by 1 and recombine :)
  let locations = callstack.map(frame => frame.calledFromLocation);
  //remove initial null, add final location on end
  locations.shift();
  locations.push(location);
  debug("locations: %O", locations);
  const names = callstack.map(
    ({ functionName, contractName, address, type }) => ({
      functionName,
      contractName,
      address,
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
     * .strippedLocation
     */
    strippedLocation: createLeaf(
      ["./location/source", "./location/sourceRange"],
      ({ id, sourcePath, internal }, sourceRange) => ({
        source: { id, sourcePath, internal },
        sourceRange
      })
    ),

    /**
     * .contractNode
     * WARNING: ad-hoc selector only meant to be used
     * when you're on a function node!
     * should probably be replaced by something better;
     * the data submodule handles these things a better way
     */
    contractNode: createLeaf(
      ["./location/source", "./location/pointer"],
      ({ ast }, pointer) =>
        pointer
          ? jsonpointer.get(
              ast,
              pointer.replace(/\/nodes\/\d+$/, "") //cut off end
            )
          : ast
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
     * stacktrace.current.context
     */
    context: createLeaf([evm.current.context], identity),

    /**
     * stacktrace.current.callContext
     */
    callContext: createLeaf([evm.current.step.callContext], identity),

    /**
     * stacktrace.current.willReturn
     */
    willReturn: createLeaf([solidity.current.willReturn], identity),

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
     * Crudely decodes the current revert string, OR the current panic.
     * Returns { Error: <string> } or { Panic: <BN> }
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
              switch (revertStringInfo.kind) {
                case "valid":
                  return { Error: revertStringInfo.asString };
                case "malformed":
                  //turn into a JS string while smoothing over invalid UTF-8
                  //slice 2 to remove 0x prefix
                  return {
                    Error: Buffer.from(
                      revertStringInfo.asHex.slice(2),
                      "hex"
                    ).toString()
                  };
              }
            case "Panic":
              const panicCode = decoding.arguments[0].value.value.asBN;
              return { Panic: panicCode };
            default:
              return undefined;
          }
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
          null,
          undefined
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
