import debugModule from "debug";
const debug = debugModule("debugger:store:development");

import { composeWithDevTools } from "remote-redux-devtools";

import commonConfigure from "./common";

export default function configureStore(reducer, saga, initialState) {
  const composeEnhancers = composeWithDevTools({
    realtime: false,
    actionsBlacklist: [
      "RECEIVE_TRACE",
      "SCOPE",
      "DECLARE_VARIABLE",
      "ASSIGN",
      "ADVANCE",
      "SAVE_STEPS",
      "BEGIN_STEP",
      "NEXT"
    ],
    stateSanitizer: _state => ({
      // session: state.session,
      // context: state.context,
      // evm: state.evm,
      // solidity: state.solidity,
      // data: state.data,
    }),

    startOn: "SESSION_READY",
    name: "@truffle/debugger",
    hostname: "localhost",
    port: 11117
  });

  return commonConfigure(reducer, saga, initialState, composeEnhancers);
}
