import StateReducer from "../reducers";
import InstructionView from "./instruction";
import StepView from "./step";

export default class SessionView {
  constructor(contexts, trace) {
    this._contexts = contexts;
    this._trace = trace;

    this.view = {
      instruction: new InstructionView(contexts, trace),
      step: new StepView(contexts, trace),
    }
  }

  affectedAddresses() {
    return this._contexts.affectedAddresses();
  }

  missingSources() {
    let missing = [];

    for (let address of Object.keys(this._contexts.indexForAddress)) {
      let context = this._contexts.contextForAddress(address);

      if (!context.source) {
        missing.push(address);
      }
    }

    return missing;
  }

  /**
   * Given a state, compute the next action from the trace and call context
   */
  nextAction(state) {
    const step = this._trace[state.traceIndex];
    if (!step) {
      return undefined;
    }

    const context = this.callContext(state);

    const instruction = context.instructionAtProgramCounter(step.pc);

    return {
      step,
      instruction
    };
  }

  /**
   * Given a state and an action, compute the next state
   */
  nextState(state, action) {
    if (!action) {
      return null;
    }

    const stateReducer = new StateReducer(this.view);
    return stateReducer.reduce(state, action);
  }

  /**
   * Return the current call for a given state
   */
  currentCall(state) {
    return state.callstack[state.callstack.length - 1];
  }

  /**
   * Fetch the context for the current call for a given state
   */
  callContext(state) {
    const call = this.currentCall(state);

    if (call.address) {
      return this._contexts.contextForAddress(call.address);

    } else if (call.binary) {
      return this._contexts.contextForBinary(call.binary);

    } else {
      throw new Error("malformed value for Call");
    }
  }


}
