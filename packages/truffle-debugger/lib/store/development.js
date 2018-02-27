import debugModule from "debug";
const debug = debugModule("debugger:store:development");

import { composeWithDevTools } from "remote-redux-devtools";

import commonConfigure from "./common";

export default function configureStore (reducer, saga, initialState) {
  const composeEnhancers = composeWithDevTools({
    realtime: true,
    actionsBlacklist: [
      "RECEIVE_TRACE", "NODE_EXIT", "NODE_ENTER", "SCOPE", "DECLARE_VARIABLE",
      "ASSIGN", "ADVANCE", "SAVE_STEPS", "BEGIN_STEP", "NEXT"
    ],
    stateSanitizer: (state) => ({
      session: state.session,
      context: state.context,
      evm: state.evm,
      solidity: state.solidity,
      data: state.data,
    }),

    port: 1117
  });

  return commonConfigure(reducer, saga, initialState, composeEnhancers);
}
