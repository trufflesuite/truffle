import debugModule from "debug";

import InstructionView from "./views/instruction";

const debug = debugModule("debugger:session");


/**
 * Debugger Session
 */
export default class Session {
  /**
   * @param {function(state: State): StateView} viewer - function to view state
   * @param {State} initialState - initial state
   */
  constructor(view, initialState) {
    this._view = view;
    this._state = initialState;
  }

  get state() {
    return this._state;
  }

  get view() {
    return this._view;
  }

  /**
   * Advance the state by one instruction
   */
  advance() {
    let action = this.view.nextAction(this.state);
    this._state = this.view.nextState(this.state, action);
  }

  /**
   * Advance the state while a condition function returns true
   *
   * @param {Function}   condition  - Function (initialState, initialAction, currentState, nextAction) => bool
   */
  advanceWhile(condition) {
    let initialState = this.state;
    debug("initialState: %o", initialState);
    let initialAction = this.view.nextAction(initialState);
    debug("initialAction: %o", initialAction);

    let currentState = this.state;
    let nextAction = initialAction;

    while (
      currentState && nextAction &&
        condition(initialState, initialAction, currentState, nextAction)
    ) {
      this.advance();

      currentState = this.state;
      if (currentState) {
        nextAction = this.view.nextAction(currentState);
      }
    }
  }

  /**
   * stepNext - step to the next logical code segment
   *
   * Note: It might take multiple instructions to express the same section of code.
   * "Stepping", then, is stepping to the next logical item, not stepping to the next
   * instruction. See advance() if you'd like to advance by one instruction.
   */
  stepNext() {
    this.advanceWhile(
      (initialState, initialAction, currentState, nextAction) => {
        return (
          initialAction.instruction.start == nextAction.instruction.start &&
          initialAction.instruction.length == nextAction.instruction.length
        );
      }
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
  stepInto() {
    let nextAction = this.view.nextAction(this.state);
    let instruction = new InstructionView(nextAction.instruction);

    if (instruction.isJump()) {
      // If we're directly on a jump, then just do it.
      this.stepNext();
    } else if (instruction.hasMultiLineCodeRange()) {
      // If we're at an instruction that has a multiline code range (like a function definition)
      // treat this step into like a step over as they're functionally equivalent.
      this.stepOver();
    } else {
      // So we're not directly on a jump, and we're not multi line.
      // Let's step until we either find a jump or get out of the current range.
      this.advanceWhile(
        (initialState, initialAction, currentState, nextAction) => {
          let initialStateView = this._viewer(initialState);
          let currentStateView = this._viewer(currentState);

          let initialDepth = initialStateView.currentCall().functionDepth;
          let currentDepth = initialStateView.currentCall().functionDepth;

          // condition #1 - we're in another function call
          if (currentDepth > initialDepth) {
            return false;
          }

          // condition #2 - we're outside the original range
          // If we have a new instruction that exists outside of the starting range,
          // then the starting instruction must not have been one that jumps anywhere.
          let lowerBounds = initialAction.instruction.start;
          let upperBounds = initialAction.instruction.start + initialAction.instruction.length;

          let nextInstructionStart = nextAction.instruction.start;
          let nextInstructionEnd = nextAction.instruction.start + nextAction.instruction.length;

          if (nextInstructionStart < lowerBounds || nextInstructionEnd > upperBounds) {
            return false;
          }

          // otherwise, proceed
          return true;
        }
      );
    }
  }

  /**
   * Step out of the current function
   *
   * This will run until the debugger encounters a decrease in function depth.
   */
  stepOut() {
    let nextAction = this.view.nextAction();

    // If we're at an instruction that has a multiline code range (like a function definition)
    // treat this step out like a step over as they're functionally equivalent.
    if (hasMultiLineCodeRange(nextAction.instruction)) {
      this.stepOver();
    } else {
      this.advanceWhile(
        (initialState, initialAction, currentState, nextAction) => {
          let initialStateView = this._viewer(initialState);
          let currentStateView = this._viewer(currentState);


          let initialDepth = initialStateView.currentCall().functionDepth;
          let currentDepth = initialStateView.currentCall().functionDepth;


          return initialDepth >= currentDepth;
        }
      );
    }
  }

  /**
   * stepOver - step over the current line
   *
   * Step over the current line. This will step to the next instruction that
   * exists on a different line of code within the same function depth.
   */
  stepOver() {
    this.advanceWhile(
      (initialState, initialAction, currentState, nextAction) => {
        let initialStateView = this._viewer(initialState);
        let currentStateView = this._viewer(currentState);

        let initialDepth = initialStateView.currentCall().functionDepth;
        let currentDepth = initialStateView.currentCall().functionDepth;

        // Stop if stepping over caused us to step out of a contract or function.
        if (currentDepth < initialDepth) {
          return false;
        }

        // If we encountered a new line, bail, but only do it when we're at the same functionDepth
        // (i.e., don't step into any new function calls).
        if (
          currentDepth == initialDepth &&
          nextAction.instruction.range.start.line != firstAction.range.start.line
        ) {
          return false;
        }

        // otherwise, continue
        return true;
      }
    );
  }
}
