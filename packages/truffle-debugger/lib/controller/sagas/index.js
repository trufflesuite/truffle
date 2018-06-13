import debugModule from "debug";
const debug = debugModule("debugger:controller:sagas");

import { put, call, race, take, select } from 'redux-saga/effects';

import { prefixName } from "lib/helpers";

import * as trace from "lib/trace/sagas";

import * as actions from "../actions";

import controller from "../selectors";

const CONTROL_SAGAS = {
  [actions.ADVANCE]: advance,
  [actions.STEP_NEXT]: stepNext,
  [actions.STEP_OVER]: stepOver,
  [actions.STEP_INTO]: stepInto,
  [actions.STEP_OUT]: stepOut,
  [actions.CONTINUE_UNTIL]: continueUntil
};

/** AST node types that are skipped to filter out some noise */
const SKIPPED_TYPES = new Set([
  "ContractDefinition",
  "VariableDeclaration",
]);

export function* saga() {
  while (true) {
    debug("waiting for control action");
    let action = yield take(Object.keys(CONTROL_SAGAS));
    debug("got control action");
    let saga = CONTROL_SAGAS[action.type];

    yield put(actions.beginStep(action.type));

    yield race({
      exec: call(saga, action),
      interrupt: take(actions.INTERRUPT)
    });
  }
}

export default prefixName("controller", saga);

/**
 * Advance the state by one instruction
 */
function* advance() {
  // send action to advance trace
  yield *trace.advance();
}

/**
 * stepNext - step to the next logical code segment
 *
 * Note: It might take multiple instructions to express the same section of code.
 * "Stepping", then, is stepping to the next logical item, not stepping to the next
 * instruction. See advance() if you'd like to advance by one instruction.
 */
function* stepNext () {
  const startingRange = yield select(controller.current.location.sourceRange);

  var upcoming;

  do {
    // advance at least once step
    yield* advance();

    // and check the next source range
    upcoming = yield select(controller.current.location);

    // if the next step's source range is still the same, keep going
  } while (
    !upcoming.node ||
    SKIPPED_TYPES.has(upcoming.node.nodeType) ||

    upcoming.sourceRange.start == startingRange.start &&
    upcoming.sourceRange.length == startingRange.length
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
function* stepInto () {
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

  do {
    yield* stepNext();

    currentDepth = yield select(controller.current.functionDepth);
    currentRange = yield select(controller.current.location.sourceRange);

  } while (
    // the function stack has not increased,
    currentDepth <= startingDepth &&

    // the current source range begins on or after the starting range
    currentRange.start >= startingRange.start &&

    // and the current range ends on or before the starting range ends
    (currentRange.start + currentRange.length) <=
      (startingRange.start + startingRange.length)
  );
}

/**
 * Step out of the current function
 *
 * This will run until the debugger encounters a decrease in function depth.
 */
function* stepOut () {
  if (yield select(controller.current.location.isMultiline)) {
    yield *stepOver();

    return;
  }

  const startingDepth = yield select(controller.current.functionDepth);
  var currentDepth;

  do {
    yield* stepNext();

    currentDepth = yield select(controller.current.functionDepth);

  } while(currentDepth >= startingDepth);
}

/**
 * stepOver - step over the current line
 *
 * Step over the current line. This will step to the next instruction that
 * exists on a different line of code within the same function depth.
 */
function* stepOver () {
  const startingDepth = yield select(controller.current.functionDepth);
  const startingRange = yield select(controller.current.location.sourceRange);
  var currentDepth;
  var currentRange;

  do {
    yield* stepNext();

    currentDepth = yield select(controller.current.functionDepth);
    currentRange = yield select(controller.current.location.sourceRange);

  } while (
    // keep stepping provided:
    //
    // we haven't jumped out
    !(currentDepth < startingDepth) &&

    // either: function depth is greater than starting (ignore function calls)
    // or, if we're at the same depth, keep stepping until we're on a new
    // line.
    (currentDepth > startingDepth ||
      currentRange.lines.start.line == startingRange.lines.start.line)
  )
}

/**
 * continueUntil - step through execution until a breakpoint
 *
 * @param breakpoints - array of breakpoints ({ ...call, line })
 */
function *continueUntil ({breakpoints}) {
  var currentCall;
  var currentLocation;

  let breakpointHit = false;

  do {
    yield* stepNext();

    currentCall = yield select(controller.current.executionContext);
    currentLocation = yield select(controller.current.location);

    breakpointHit = breakpoints
      .filter( ({address, binary, line, node}) =>
        (
          address == currentCall.address ||
          binary == currentCall.binary
        ) && (
          line == currentLocation.sourceRange.lines.start.line ||
          node == currentLocation.node.id
        )
      )
      .length > 0;

  } while (!breakpointHit);
}
