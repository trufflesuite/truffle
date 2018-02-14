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
    stateTransformer: (state) => ({
      ...state,

      data: {
        ...Object.assign(
          {},
          ...Object.entries(state.data)
            .map( ([context, scope]) => ({
              [context]: {
                ...Object.assign(
                  {},
                  ...Object.entries(scope)
                    .filter( ([id, {variables}]) => variables && variables.length > 0 )
                    .map(
                      ([id, {variables}]) => ({
                        [id]: (variables || []).map( (v) => v.name )
                      })
                    )
                )
              }
            }))
        )
      },

      context: {
        list: ["..."],
        indexForAddress: {"...": "..."},
        indexForBinary: {"...": "..."},
      },

      trace: {
        ...state.trace,
        steps: ["..."]
      }
    })
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
