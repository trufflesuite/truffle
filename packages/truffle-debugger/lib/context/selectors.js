import debugModule from "debug";
const debug = debugModule("debugger:selectors:currentContext");

import { createSelector, createStructuredSelector } from "reselect";

const contextSet = (state, props) => props.contexts

const currentCall = (state, props) =>
  state.evm.callstack[state.evm.callstack.length - 1];

const currentContext = createSelector(
  [currentCall, contextSet],

  ({address, binary}, contexts) => {
    if (address) {
      return contexts.contextForAddress(address);
    } else {
      return contexts.contextForBinary(binary);
    }
  }
)

const affectedInstances = createSelector(
  [contextSet],

  (contexts) => contexts.addressedContracts()
);

let selector = createStructuredSelector({
  current: currentContext,
  affectedInstances: affectedInstances
});
selector.current = currentContext;
selector.affectedInstances = affectedInstances;

export default selector;
