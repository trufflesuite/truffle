import debugModule from "debug";
const debug = debugModule("debugger:store:common");
const reduxDebug = debugModule("debugger:redux");

import { compose, createStore, applyMiddleware } from "redux";
import createSagaMiddleware from "redux-saga";
import createLogger from "redux-cli-logger";

export default function configureStore (reducer, saga, initialState, composeEnhancers) {
  const sagaMiddleware = createSagaMiddleware();

  if (!composeEnhancers) {
    composeEnhancers = compose;
  }

  const loggerMiddleware = createLogger({
    log: reduxDebug,
    stateTransformer: (session) => session.state
  });

  let store = createStore(
    reducer, initialState,

    composeEnhancers(
      applyMiddleware(
        sagaMiddleware,
        loggerMiddleware
      )
    )
  );

  sagaMiddleware.run(saga);

  return store;
}
