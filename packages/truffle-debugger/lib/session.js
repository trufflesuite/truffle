import debugModule from "debug";
const debug = debugModule("debugger:session");
const reduxDebug = debugModule("debugger:redux");

import { createStore, applyMiddleware } from "redux";

import createSagaMiddleware from "redux-saga";
import createLogger from "redux-cli-logger";

import rootSaga from "./sagas";
import reducer from "./reducers";
import * as actions from "./controller/actions";

import trace from "./trace/selectors";
import context from "./context/selectors";

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
    const sagaMiddleware = createSagaMiddleware();

    const loggerMiddleware = createLogger({
      log: reduxDebug,
      stateTransformer: (session) => session.state
    });

    this._store = createStore(
      reducer,

      {
        props: { contexts, trace },
        state: initialState
      },

      applyMiddleware(
        sagaMiddleware,
        loggerMiddleware
      )
    );

    sagaMiddleware.run(rootSaga);
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
    return this.finished && this.view(context.callstack).length
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
