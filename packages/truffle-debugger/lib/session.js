import debugModule from "debug";
const debug = debugModule("debugger:session");

import { createStore, applyMiddleware } from "redux";

import createSagaMiddleware from "redux-saga";
import createCLILogger from "redux-cli-logger";

import rootSaga from "./sagas";
import reducer from "./reducers";
import * as actions from "./controller/actions";

import trace from "./trace/selectors";

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
    const logger = createCLILogger({
      stateTransformer: (session) => session.state
    });

    this._store = createStore(
      reducer,

      {
        props: { contexts, trace },
        state: initialState
      },

      applyMiddleware(
        logger,
        sagaMiddleware
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

  dispatch(action) {
    if (this.finished) {
      debug("finished: intercepting action %o", action);

      return;
    }

    this._store.dispatch(action);
  }

  interrupt() {
    this.dispatch(actions.interrupt());
  }

  advance() {
    this.dispatch(actions.advance());
  }

  stepNext() {
    this.dispatch(actions.stepNext());
  }

  stepOver() {
    this.dispatch(actions.stepOver());
  }

  stepInto() {
    this.dispatch(actions.stepInto());
  }

  stepOut() {
    this.dispatch(actions.stepOut());
  }
}
