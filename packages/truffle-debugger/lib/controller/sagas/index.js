import debugModule from "debug";
const debug = debugModule("debugger:controller:sagas");

import { put, call, race, take, select } from "redux-saga/effects";

import { prefixName } from "lib/helpers";

import * as trace from "lib/trace/sagas";
import * as data from "lib/data/sagas";
import * as evm from "lib/evm/sagas";
import * as solidity from "lib/solidity/sagas";

import * as actions from "../actions";

import controller from "../selectors";

const CONTROL_SAGAS = {
  [actions.ADVANCE]: advance,
  [actions.STEP_NEXT]: stepNext,
  [actions.STEP_OVER]: stepOver,
  [actions.STEP_INTO]: stepInto,
  [actions.STEP_OUT]: stepOut,
  [actions.CONTINUE]: continueUntilBreakpoint,
  [actions.RESET]: reset
};

/** AST node types that are skipped to filter out some noise */
const SKIPPED_TYPES = new Set(["ContractDefinition", "VariableDeclaration"]);

export function* saga() {
  while (true) {
    debug("waiting for control action");
    let action = yield take(Object.keys(CONTROL_SAGAS));
    debug("got control action");
    let saga = CONTROL_SAGAS[action.type];

    yield race({
      exec: call(saga, false), //don't suppress done!
      interrupt: take(actions.INTERRUPT)
    });
  }
}

export default prefixName("controller", saga);

//NOTE: many of these stepping sagas will take a (false by default)
//"suppressDone" option.  this should be set to true when calling them from
//another stepping saga so that the stepping won't be marked as done until the
//whole thing is done.

/**
 * Advance the state by one instruction
 */
function* advance(suppressDone = false) {
  // send action to advance trace
  debug("advance, suppressDone = %o", suppressDone);
  yield* trace.advance();
  if (!suppressDone) {
    yield put(actions.doneStepping());
  }
}

/**
 * stepNext - step to the next logical code segment
 *
 * Note: It might take multiple instructions to express the same section of code.
 * "Stepping", then, is stepping to the next logical item, not stepping to the next
 * instruction. See advance() if you'd like to advance by one instruction.
 */
function* stepNext(suppressDone = false) {
  const startingRange = yield select(controller.current.location.sourceRange);
  debug("stepNext, suppressDone = %o", suppressDone);

  var upcoming, finished;

  do {
    // advance at least once step
    yield* advance(true);

    // and check the next source range
    try {
      upcoming = yield select(controller.current.location);
    } catch (e) {
      upcoming = null;
    }

    finished = yield select(controller.finished);

    // if the next step's source range is still the same, keep going
  } while (
    !finished &&
    (!upcoming ||
      !upcoming.node ||
      SKIPPED_TYPES.has(upcoming.node.nodeType) ||
      (upcoming.sourceRange.start == startingRange.start &&
        upcoming.sourceRange.length == startingRange.length))
  );
  if (!suppressDone) {
    debug("stepNext putting doneStepping");
    yield put(actions.doneStepping());
  }
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
function* stepInto(suppressDone = false) {
  if (yield select(controller.current.willJump)) {
    yield* stepNext(suppressDone); //we'll let stepNext give the done signal
    return;
  }

  if (yield select(controller.current.location.isMultiline)) {
    yield* stepOver(suppressDone); //we'll let stepOver give the done signal
    return;
  }

  const startingDepth = yield select(controller.current.functionDepth);
  const startingRange = yield select(controller.current.location.sourceRange);
  var currentDepth;
  var currentRange;

  do {
    yield* stepNext(true);

    currentDepth = yield select(controller.current.functionDepth);
    currentRange = yield select(controller.current.location.sourceRange);
  } while (
    // the function stack has not increased,
    currentDepth <= startingDepth &&
    // the current source range begins on or after the starting range
    currentRange.start >= startingRange.start &&
    // and the current range ends on or before the starting range ends
    currentRange.start + currentRange.length <=
      startingRange.start + startingRange.length
  );
  if (!suppressDone) {
    yield put(actions.doneStepping());
  }
}

/**
 * Step out of the current function
 *
 * This will run until the debugger encounters a decrease in function depth.
 */
function* stepOut(suppressDone = false) {
  if (yield select(controller.current.location.isMultiline)) {
    yield* stepOver(suppressDone); //we'll let stepOver give the done signal
    return;
  }

  const startingDepth = yield select(controller.current.functionDepth);
  var currentDepth;

  do {
    yield* stepNext(true);

    currentDepth = yield select(controller.current.functionDepth);
  } while (currentDepth >= startingDepth);
  if (!suppressDone) {
    yield put(actions.doneStepping());
  }
}

/**
 * stepOver - step over the current line
 *
 * Step over the current line. This will step to the next instruction that
 * exists on a different line of code within the same function depth.
 */
function* stepOver(suppressDone = false) {
  const startingDepth = yield select(controller.current.functionDepth);
  const startingRange = yield select(controller.current.location.sourceRange);
  var currentDepth;
  var currentRange;

  do {
    yield* stepNext(true);

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
  );
  if (!suppressDone) {
    yield put(actions.doneStepping());
  }
}

/**
 * continueUntilBreakpoint - step through execution until a breakpoint
 */
function* continueUntilBreakpoint(suppressDone = false) {
  var currentLocation, currentNode, currentLine, currentSourceId;
  var finished;
  var previousLine, previousSourceId;

  debug("continue, suppressDone = %o", suppressDone);

  let breakpoints = yield select(controller.breakpoints);

  let breakpointHit = false;

  currentLocation = yield select(controller.current.location);
  currentNode = currentLocation.node.id;
  currentLine = currentLocation.sourceRange.lines.start.line;
  currentSourceId = currentLocation.source.id;

  do {
    yield* stepNext(true);

    previousLine = currentLine;
    previousSourceId = currentSourceId;

    currentLocation = yield select(controller.current.location);
    finished = yield select(controller.finished);
    debug("finished %o", finished);

    currentNode = currentLocation.node.id;
    currentLine = currentLocation.sourceRange.lines.start.line;
    currentSourceId = currentLocation.source.id;

    breakpointHit =
      breakpoints.filter(({ sourceId, line, node }) => {
        if (node !== undefined) {
          debug("node %d currentNode %d", node, currentNode);
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
  } while (!breakpointHit && !finished);
  if (!suppressDone) {
    yield put(actions.doneStepping());
  }
}

/**
 * reset -- reset the state of the debugger
 */
function* reset(suppressDone = false) {
  yield* data.reset();
  yield* evm.reset();
  yield* solidity.reset();
  yield* trace.reset();
  if (!suppressDone) {
    yield put(actions.doneStepping());
  }
}
