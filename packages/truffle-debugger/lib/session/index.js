import debugModule from "debug";
const debug = debugModule("debugger:session");

import rootSaga from "./sagas";
import reducer from "./reducers";

import * as controller from "../controller/actions";
import * as actions from "./actions";
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
  constructor(contracts, txHash, provider) {
    this._store = configureStore(reducer, rootSaga);

    // record contracts
    this._store.dispatch(actions.recordContracts(...contracts));

    this._store.dispatch(actions.start(txHash, provider));
  }

  ready() {
    return new Promise( (accept, reject) => {
      this._store.subscribe( () => {
        if (this.state.session == "READY") {
          accept()
        }
      });
    });
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
    return this.dispatch(controller.interrupt());
  }

  advance() {
    return this.dispatch(controller.advance());
  }

  stepNext() {
    return this.dispatch(controller.stepNext());
  }

  stepOver() {
    return this.dispatch(controller.stepOver());
  }

  stepInto() {
    return this.dispatch(controller.stepInto());
  }

  stepOut() {
    return this.dispatch(controller.stepOut());
  }
}
