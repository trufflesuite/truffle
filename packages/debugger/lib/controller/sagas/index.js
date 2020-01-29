import debugModule from "debug";
const debug = debugModule("debugger:controller:sagas");

import { put, call, race, take, select } from "redux-saga/effects";

import { prefixName, isDeliberatelySkippedNodeType } from "lib/helpers";

import * as trace from "lib/trace/sagas";
import * as data from "lib/data/sagas";
import * as evm from "lib/evm/sagas";
import * as solidity from "lib/solidity/sagas";

import * as actions from "../actions";

import controller from "../selectors";

const STEP_SAGAS = {
  [actions.ADVANCE]: advance,
  [actions.STEP_NEXT]: stepNext,
  [actions.STEP_OVER]: stepOver,
  [actions.STEP_INTO]: stepInto,
  [actions.STEP_OUT]: stepOut,
  [actions.CONTINUE]: continueUntilBreakpoint
};

export function* saga() {
  while (true) {
    debug("waiting for control action");
    let action = yield take(Object.keys(STEP_SAGAS));
    if (!(yield select(controller.current.trace.loaded))) {
      continue; //while no trace is loaded, step actions are ignored
    }
    debug("got control action");
    let saga = STEP_SAGAS[action.type];

    yield put(actions.startStepping());
    yield race({
      exec: call(saga, action), //not all will use this
      interrupt: take(actions.INTERRUPT)
    });
    yield put(actions.doneStepping());
  }
}

export default prefixName("controller", saga);

/*
 * Advance the state by the given number of instructions (but not past the end)
 * (if no count given, advance 1)
 */
function* advance(action) {
  let count =
    action !== undefined && action.count !== undefined ? action.count : 1;
  //default is, as mentioned, to advance 1
  for (
    let i = 0;
    i < count && !(yield select(controller.current.trace.finished));
    i++
  ) {
    yield* trace.advance();
  }
}

/**
 * stepNext - step to the next logical code segment
 *
 * Note: It might take multiple instructions to express the same section of code.
 * "Stepping", then, is stepping to the next logical item, not stepping to the next
 * instruction. See advance() if you'd like to advance by one instruction.
 */
function* stepNext() {
  const startingRange = yield select(controller.current.location.sourceRange);

  var upcoming, finished;

  do {
    // advance at least once step
    yield* advance();

    // and check the next source range
    try {
      upcoming = yield select(controller.current.location);
    } catch (e) {
      upcoming = null;
    }

    finished = yield select(controller.current.trace.finished);

    // if the next step's source range is still the same, keep going
  } while (
    !finished &&
    (!upcoming ||
      !upcoming.node ||
      isDeliberatelySkippedNodeType(upcoming.node) ||
      (upcoming.sourceRange.start == startingRange.start &&
        upcoming.sourceRange.length == startingRange.length))
  );
}

/**
 * stepInto - step into the current function
 *
 * Conceptually this is easy, but from a programming standpoint it's hard.
 * Code like `getBalance(msg.sender)` might be highlighted, but there could
 * be a number of different intermediate steps (like evaluating `msg.sender`)
 * before `getBalance` is stepped into. This function will step into the first
 * function available (where instruction.jump == "i"), ignoring any intermediate
 * steps that fall within the same code range. If there's a step encountered
 * that exists outside of the range, then stepInto will only execute until that
 * step.
 */
function* stepInto() {
  if (yield select(controller.current.willJump)) {
    yield* stepNext();
    return;
  }

  if (yield select(controller.current.location.isMultiline)) {
    yield* stepOver();
    return;
  }

  const startingDepth = yield select(controller.current.functionDepth);
  const startingRange = yield select(controller.current.location.sourceRange);
  var currentDepth;
  var currentRange;
  var finished;

  do {
    yield* stepNext();

    currentDepth = yield select(controller.current.functionDepth);
    currentRange = yield select(controller.current.location.sourceRange);
    finished = yield select(controller.current.trace.finished);
  } while (
    //we aren't finished,
    !finished &&
    // the function stack has not increased,
    currentDepth <= startingDepth &&
    // the current source range begins on or after the starting range,
    currentRange.start >= startingRange.start &&
    // and the current range ends on or before the starting range ends
    currentRange.start + currentRange.length <=
      startingRange.start + startingRange.length
  );
}

/**
 * Step out of the current function
 *
 * This will run until the debugger encounters a decrease in function depth
 * (or finishes)
 */
function* stepOut() {
  if (yield select(controller.current.location.isMultiline)) {
    yield* stepOver();
    return;
  }

  const startingDepth = yield select(controller.current.functionDepth);
  var currentDepth;
  var finished;

  do {
    yield* stepNext();

    currentDepth = yield select(controller.current.functionDepth);
    finished = yield select(controller.current.trace.finished);
  } while (!finished && currentDepth >= startingDepth);
}

/**
 * stepOver - step over the current line
 *
 * Step over the current line. This will step to the next instruction that
 * exists on a different line of code within the same function depth.
 */
function* stepOver() {
  const startingDepth = yield select(controller.current.functionDepth);
  const startingRange = yield select(controller.current.location.sourceRange);
  var currentDepth;
  var currentRange;
  var finished;

  do {
    yield* stepNext();

    currentDepth = yield select(controller.current.functionDepth);
    currentRange = yield select(controller.current.location.sourceRange);
    finished = yield select(controller.current.trace.finished);
  } while (
    // keep stepping provided:
    //
    // we haven't finished
    !finished &&
    // we haven't jumped out
    !(currentDepth < startingDepth) &&
    // either: function depth is greater than starting (ignore function calls)
    // or, if we're at the same depth, keep stepping until we're on a new
    // line.
    (currentDepth > startingDepth ||
      currentRange.lines.start.line == startingRange.lines.start.line)
  );
}

/**
 * continueUntilBreakpoint - step through execution until a breakpoint
 */
function* continueUntilBreakpoint(action) {
  //if breakpoints was not specified, use the stored list from the state.
  //if it was, override that with the specified list.
  //note that explicitly specifying an empty list will advance to the end.
  let breakpoints =
    action !== undefined && action.breakpoints !== undefined
      ? action.breakpoints
      : yield select(controller.breakpoints);

  let breakpointHit = false;

  let currentLocation = yield select(controller.current.location);
  let currentLine = currentLocation.sourceRange.lines.start.line;
  let currentSourceId = currentLocation.source.id;

  do {
    yield* stepNext();

    //note these two have not been updated yet; they'll be updated a
    //few lines down.  but at this point these are still the previous
    //values.
    let previousLine = currentLine;
    let previousSourceId = currentSourceId;

    currentLocation = yield select(controller.current.location);
    debug("currentLocation: %O", currentLocation);
    let finished = yield select(controller.current.trace.finished);
    if (finished) {
      break; //can break immediately if finished
    }

    currentSourceId = currentLocation.source.id;
    if (currentSourceId === undefined) {
      continue; //never stop on an unmapped instruction
    }
    let currentNode = currentLocation.node.id;
    currentLine = currentLocation.sourceRange.lines.start.line;

    breakpointHit =
      breakpoints.filter(({ sourceId, line, node }) => {
        if (node !== undefined) {
          return sourceId === currentSourceId && node === currentNode;
        }
        //otherwise, we have a line-style breakpoint; we want to stop at the
        //*first* point on the line
        return (
          sourceId === currentSourceId &&
          line === currentLine &&
          (currentSourceId !== previousSourceId || currentLine !== previousLine)
        );
      }).length > 0;
  } while (!breakpointHit);
}

/**
 * reset -- reset the state of the debugger
 */
export function* reset() {
  yield* data.reset();
  yield* evm.reset();
  yield* solidity.reset();
  yield* trace.reset();
}
