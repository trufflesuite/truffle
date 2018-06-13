import debugModule from "debug";
const debug = debugModule("debugger:store:common");
const reduxDebug = debugModule("debugger:redux");

import { compose, createStore, applyMiddleware } from "redux";
import createSagaMiddleware from "redux-saga";
import createLogger from "redux-cli-logger";

export function abbreviateValues(value, options = {}, depth = 0) {
  options.stringLimit = options.stringLimit || 66;
  options.arrayLimit = options.arrayLimit || 8;
  options.recurseLimit = options.recurseLimit || 4;

  if (depth > options.recurseLimit) {
    return "...";
  }

  const recurse = (child) => abbreviateValues(child, options, depth + 1);

  if (value instanceof Array) {
    if (value.length > options.arrayLimit) {
      value = [
        ...value.slice(0, options.arrayLimit / 2),
        "...",
        ...value.slice(value.length - options.arrayLimit / 2 + 1)
      ];
    }

    return value.map(recurse);

  } else if (value instanceof Object) {
    return Object.assign({},
      ...Object.entries(value).map(
        ([k, v]) => ({ [recurse(k)]: recurse(v) })
      )
    );

  } else if (typeof value === "string" && value.length > options.stringLimit) {
    let inner = "...";
    let extractAmount = (options.stringLimit - inner.length) / 2;
    let leading = value.slice(0, Math.ceil(extractAmount));
    let trailing = value.slice(value.length - Math.floor(extractAmount));
    return `${leading}${inner}${trailing}`;

  } else {
    return value;
  }
}

export default function configureStore (reducer, saga, initialState, composeEnhancers) {
  const sagaMiddleware = createSagaMiddleware();

  if (!composeEnhancers) {
    composeEnhancers = compose;
  }

  const loggerMiddleware = createLogger({
    log: reduxDebug,
    stateTransformer: (state) => abbreviateValues(state, {
      arrayLimit: 4,
      recurseLimit: 3
    }),
    actionTransformer: abbreviateValues,
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
