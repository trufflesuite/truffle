import debugModule from "debug";
const debug = debugModule("debugger:controller:sagas");

import { put, call, race, take, select } from "redux-saga/effects";

import { prefixName, isDeliberatelySkippedNodeType } from "lib/helpers";

import * as trace from "lib/trace/sagas";
import * as data from "lib/data/sagas";
import * as txlog from "lib/txlog/sagas";
import * as evm from "lib/evm/sagas";
import * as solidity from "lib/solidity/sagas";
import * as stacktrace from "lib/stacktrace/sagas";

import * as actions from "../actions";

import controller from "../selectors";

const STEP_SAGAS = {
  [actions.ADVANCE]: advance,
  [actions.STEP_NEXT]: stepNext,
  [actions.STEP_OVER]: stepOver,
  [actions.STEP_INTO]: stepInto,
  [actions.STEP_OUT]: stepOut,
  [actions.CONTINUE]: continueUntilBreakpoint,
  [actions.RUN_TO_END]: runToEnd
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

/**
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
 *
 * Note that if you are not in an internal source, this function will not stop in one
 * (unless it hits the end of the trace); you will need to use advance() to get into
 * one.  However, if you are already in an internal source, this function will not
 * automatically step all the way out of it.
 */
function* stepNext() {
  const starting = yield select(controller.current.location);
  const allowInternal = yield select(controller.stepIntoInternalSources);

  let upcoming, finished;

  do {
    // advance at least once step
    yield* advance();

    // and check the next source range
    upcoming = yield select(controller.current.location);

    finished = yield select(controller.current.trace.finished);

    // if the next step's source range is still the same, keep going
  } while (
    !finished &&
    (!upcoming ||
      //don't stop on an internal source unless allowInternal is on or
      //we started in an internal source
      (!allowInternal &&
        upcoming.source.internal &&
        !starting.source.internal) ||
      upcoming.sourceRange.length === 0 ||
      upcoming.source.id === undefined ||
      (upcoming.node && isDeliberatelySkippedNodeType(upcoming.node)) ||
      (upcoming.sourceRange.start === starting.sourceRange.start &&
        upcoming.sourceRange.length === starting.sourceRange.length &&
        upcoming.source.id === starting.source.id))
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
  const startingDepth = yield select(controller.current.functionDepth);
  const startingLocation = yield select(controller.current.location);
  debug("startingDepth: %d", startingDepth);
  debug("starting source range: %O", (startingLocation || {}).sourceRange);
  let currentDepth;
  let currentLocation;
  let finished;

  do {
    yield* stepNext();

    currentDepth = yield select(controller.current.functionDepth);
    currentLocation = yield select(controller.current.location);
    finished = yield select(controller.current.trace.finished);
    debug("currentDepth: %d", currentDepth);
    debug("current source range: %O", (currentLocation || {}).sourceRange);
    debug("finished: %o", finished);
  } while (
    //we aren't finished,
    !finished &&
    // the function stack has not increased,
    currentDepth <= startingDepth &&
    // we haven't changed files,
    currentLocation.source.id === startingLocation.source.id &&
    //and we haven't changed lines
    currentLocation.sourceRange.lines.start.line ===
      startingLocation.sourceRange.lines.start.line
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
  const startingLocation = yield select(controller.current.location);
  var currentDepth;
  var currentLocation;
  var finished;

  do {
    yield* stepNext();

    currentDepth = yield select(controller.current.functionDepth);
    currentLocation = yield select(controller.current.location);
    finished = yield select(controller.current.trace.finished);
  } while (
    // keep stepping provided:
    //
    // we haven't finished
    !finished &&
    // we haven't jumped out
    currentDepth >= startingDepth &&
    // either: function depth is greater than starting (ignore function calls)
    // or, if we're at the same depth, keep stepping until we're on a new
    // line (which may be in a new file)
    (currentDepth > startingDepth ||
      (currentLocation.source.id === startingLocation.source.id &&
        currentLocation.sourceRange.lines.start.line ===
          startingLocation.sourceRange.lines.start.line))
  );
}

/**
 * runToEnd - run the debugger till the end
 */
function* runToEnd() {
  let finished;

  do {
    yield* advance();
    finished = yield select(controller.current.trace.finished);
  } while (!finished);
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
  let currentSourceId = currentLocation.source.id;
  let currentLine = currentLocation.sourceRange.lines.start.line;
  let currentStart = currentLocation.sourceRange.start;
  let currentLength = currentLocation.sourceRange.start;
  //note that if allow internal is on, we don't turn on the special treatment
  //of user sources even if we started in one
  const startedInUserSource =
    !(yield select(controller.stepIntoInternalSources)) &&
    currentLocation.source.id !== undefined &&
    !currentLocation.source.internal;
  //the following are set regardless, but only used if startedInUserSource
  let lastUserSourceId = currentSourceId;
  let lastUserLine = currentLine;
  let lastUserStart = currentStart;
  let lastUserLength = currentLength;

  do {
    yield* advance(); //note: this avoids using stepNext in order to
    //allow breakpoints in internal sources to work properly

    //note these three have not been updated yet; they'll be updated a
    //few lines down.  but at this point these are still the previous
    //values.
    let previousLine = currentLine;
    let previousStart = currentStart;
    let previousLength = currentLength;
    let previousSourceId = currentSourceId;
    if (!currentLocation.source.internal) {
      lastUserSourceId = currentSourceId;
      lastUserLine = currentLine;
      lastUserStart = currentStart;
      lastUserLength = currentLength;
    }

    currentLocation = yield select(controller.current.location);
    let finished = yield select(controller.current.trace.finished);
    if (finished) {
      break; //can break immediately if finished
    }

    currentSourceId = currentLocation.source.id;
    if (currentSourceId === undefined) {
      continue; //never stop on an unmapped instruction
    }
    currentLine = currentLocation.sourceRange.lines.start.line;
    currentStart = currentLocation.sourceRange.start;
    currentLength = currentLocation.sourceRange.length;

    breakpointHit =
      breakpoints.filter(({ sourceId, line, start, length }) => {
        if (start !== undefined && length !== undefined) {
          //node-based (well, source-range-based) breakpoint
          return (
            sourceId === currentSourceId &&
            start === currentStart &&
            length === currentLength &&
            (currentSourceId !== previousSourceId ||
              currentStart !== previousStart ||
              currentLength !== previousLength
            ) &&
            //if we started in a user source (& allow internal is off),
            //we need to make sure we've moved from a user-source POV
            (!startedInUserSource ||
              currentSourceId !== lastUserSourceId ||
              currentStart !== lastUserStart || 
              currentLength !== lastUserLength
            )
          );
        }
        //otherwise, we have a line-style breakpoint; we want to stop at the
        //*first* point on the line
        return (
          sourceId === currentSourceId &&
          line === currentLine &&
          (currentSourceId !== previousSourceId ||
            currentLine !== previousLine) &&
          //again, if started in a user source w/ allow internal off,
          //need to make sure we've moved from a *user*-source POV
          (!startedInUserSource ||
            currentSourceId !== lastUserSourceId ||
            currentLine !== lastUserLine)
        );
      }).length > 0;
  } while (!breakpointHit);
}

/**
 * reset -- reset the state of the debugger
 * (we'll just reset all submodules regardless of which are in use)
 */
export function* reset() {
  yield* data.reset();
  yield* evm.reset();
  yield* solidity.reset();
  yield* trace.reset();
  yield* stacktrace.reset();
  yield* txlog.reset();
}
