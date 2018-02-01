import debugModule from "debug";
const debug = debugModule("debugger:session");

import rootSaga from "./sagas";
import reducer from "./reducers";
import { recordContracts, recordTraceContexts } from "./actions";

import * as actions from "../controller/actions";
import { saveSteps } from "../trace/actions";
import configureStore from "../store";

import trace from "../trace/selectors";
import evm from "../evm/selectors";
import ast from "../ast/selectors";
import solidity from "../ast/selectors";

/**
 * Debugger Session
 */
export default class Session {
  /**
   * @param {function(state: State): StateView} viewer - function to view state
   * @param {State} initialState - initial state
   * @private
   */
  constructor(contracts, trace, traceContexts, initialState) {
    this._store = configureStore(reducer, rootSaga, initialState);

    // TODO remove awkward manual dispatch here, replace with `init` saga maybe
    this._store.dispatch(saveSteps(trace));
    this._store.dispatch(recordContracts(...contracts));
    this._store.dispatch(recordTraceContexts(...traceContexts));
  }

  ready() {
  }

  get state() {
    return this._store.getState();
  }

  view(selector) {
    return selector(this.state);
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
