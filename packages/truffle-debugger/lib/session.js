import debugModule from "debug";
const debug = debugModule("debugger:session");

import rootSaga from "./sagas";
import reducer from "./reducers";
import * as actions from "./controller/actions";
import { saveSteps } from "./trace/actions";
import configureStore from "./store";

import trace from "./trace/selectors";
import evm from "./evm/selectors";

/**
 * Debugger Session
 */
export default class Session {
  /**
   * @param {function(state: State): StateView} viewer - function to view state
   * @param {State} initialState - initial state
   * @private
   */
  constructor(contexts, trace, initialState) {
    let wrappedState = {
      props: { contexts },
      state: initialState
    };

    this._store = configureStore(reducer, rootSaga, wrappedState);

    // TODO remove awkward manual dispatch here, replace with `init` saga maybe
    this._store.dispatch(saveSteps(trace));
  }

  get state() {
    return this._store.getState();
  }

  view(selector) {
    let { state, props } = this.state;

    return selector(state, props);
  }

  get finished() {
    return this.view(trace.step) === undefined;
  }

  get failed() {
    return this.finished && this.view(evm.current.callstack).length
  }

  dispatch(action) {
    if (this.finished) {
      debug("finished: intercepting action %o", action);

      return false;
    }

    this._store.dispatch(action);

    return true;
  }

  interrupt() {
    return this.dispatch(actions.interrupt());
  }

  advance() {
    return this.dispatch(actions.advance());
  }

  stepNext() {
    return this.dispatch(actions.stepNext());
  }

  stepOver() {
    return this.dispatch(actions.stepOver());
  }

  stepInto() {
    return this.dispatch(actions.stepInto());
  }

  stepOut() {
    return this.dispatch(actions.stepOut());
  }
}
