import debugModule from "debug";
const debug = debugModule("debugger:sagas:controller");

import { put, call, race, take } from 'redux-saga/effects';
import { view } from "../effects";

import * as actions from '../actions/controller';
import { nextStep, currentState } from "../selectors";

const controlSagas = {
  [actions.STEP_NEXT]: stepNext,
  [actions.STEP_OVER]: stepOver,
  [actions.STEP_INTO]: stepInto,
  [actions.STEP_OUT]: stepOut
};

export default function* watchControls() {
  while (true) {
    debug("waiting for control action");
    let action = yield take(Object.keys(controlSagas));
    debug("got control action");
    let saga = controlSagas[action.type];

    yield put(actions.beginStep(action.type));

    yield race({
      exec: call(saga),
      interrupt: take(actions.INTERRUPT)
    });
  }
}

/**
 * Advance the state by one instruction
 */
export function* advance() {
  let remaining = yield view(currentState.trace.stepsRemaining);

  if (remaining > 0) {
    // updates state for current step
    yield put(actions.tick());

    // updates step to next step in trace
    yield put(actions.tock());

    remaining--; // local update, just for convenience
  }

  if (remaining == 0) {
    yield put(actions.endTrace());
  }
}

/**
 * stepNext - step to the next logical code segment
 *
 * Note: It might take multiple instructions to express the same section of code.
 * "Stepping", then, is stepping to the next logical item, not stepping to the next
 * instruction. See advance() if you'd like to advance by one instruction.
 */
export function* stepNext () {
  const startingRange = yield view(nextStep.solidity.sourceRange);
  var nextRange;

  do {
    // advance at least once step
    yield* advance();

    // and check the next source range
    nextRange = yield view(nextStep.solidity.sourceRange);

    // if the next step's source range is still the same, keep going
  } while (
    nextRange.start == startingRange.start &&
    nextRange.length == startingRange.length
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
export function* stepInto () {
  if (yield view(nextStep.evm.isJump)) {
    yield* stepNext();

    return;
  }

  if (yield view(nextStep.solidity.isMultiline)) {
    yield* stepOver();

    return;
  }

  const startingDepth = yield view(currentState.solidity.functionDepth);
  const startingRange = yield view(nextStep.solidity.sourceRange);
  var currentDepth;
  var nextRange;

  do {
    yield* stepNext();

    currentDepth = yield view(currentState.solidity.functionDepth);
    nextRange = yield view(nextStep.solidity.sourceRange);

  } while (
    // the function stack has not increased,
    currentDepth <= initialDepth &&

    // the next source range begins on or after the starting range
    nextRange.start >= startingRange.start &&

    // and the next range ends on or before the starting range ends
    (nextRange.start + nextRange.length) <=
      (startingRange.start + startingRange.length)
  );
}

/**
 * Step out of the current function
 *
 * This will run until the debugger encounters a decrease in function depth.
 */
export function* stepOut () {
  if (yield view(nextStep.solidity.isMultiline)) {
    yield *stepOver();

    return;
  }

  const startingDepth = yield view(currentState.solidity.functionDepth);
  var currentDepth;

  do {
    yield* stepNext();

    currentDepth = yield view(currentState.solidity.functionDepth);

  } while(currentDepth <= startingDepth);
}

/**
 * stepOver - step over the current line
 *
 * Step over the current line. This will step to the next instruction that
 * exists on a different line of code within the same function depth.
 */
export function* stepOver () {
  const startingDepth = yield view(currentState.solidity.functionDepth);
  const startingRange = yield view(nextStep.solidity.sourceRange);
  var currentDepth;
  var nextRange;

  do {
    yield* stepNext();

    currentDepth = yield view(currentState.solidity.functionDepth);
    nextRange = yield view(nextStep.solidity.sourceRange);

  } while (
    // keep stepping provided:
    //
    // we haven't jumped out
    !(currentDepth < startingDepth) &&

    // either: function depth is greater than starting (ignore function calls)
    // or, if we're at the same depth, keep stepping until we're on a new
    // line.
    (currentDepth > startingDepth ||
      nextRange.lines.start.line == startingRange.lines.start.line)
  )
}
