import Reducer from "./reducer";

import TraceIndexReducer from './traceIndex';
import CallstackReducer from './callstack';
import FunctionDepthReducer from './functionDepth';

export default class StateReducer extends Reducer {
  constructor(...args) {
    super(...args);
  }

  reduce(state = {}, action) {
    const traceIndexReducer = new TraceIndexReducer();
    const callstackReducer = new CallstackReducer({
      step: this.view.step,
      instruction: this.view.instruction
    });
    const functionDepthReducer = new FunctionDepthReducer({
      instruction: this.view.instruction
    });

    return {
      traceIndex: traceIndexReducer.reduce(state.traceIndex, action),
      callstack: callstackReducer.reduce(state.callstack, action),
      functionDepth: functionDepthReducer.reduce(state.functionDepth, action)
    }
  }
}
