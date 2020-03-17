import debugModule from "debug";
const debug = debugModule("debugger:store:common");

import { compose, createStore, applyMiddleware } from "redux";
import createSagaMiddleware from "redux-saga";

export default function configureStore(
  reducer,
  saga,
  initialState,
  composeEnhancers
) {
  const sagaMiddleware = createSagaMiddleware();

  if (!composeEnhancers) {
    composeEnhancers = compose;
  }

  let store = createStore(
    reducer,
    initialState,

    composeEnhancers(applyMiddleware(sagaMiddleware))
  );

  sagaMiddleware.run(saga);

  return { store, sagaMiddleware };
}
