import debugModule from "debug";
const debug = debugModule("debugger:store:development");

import { composeWithDevTools } from "remote-redux-devtools";

import commonConfigure from "./common";

export default function configureStore (reducer, saga, initialState) {
  const composeEnhancers = composeWithDevTools({
    realtime: true,
    port: 1117
  });

  return commonConfigure(reducer, saga, initialState, composeEnhancers);
}
