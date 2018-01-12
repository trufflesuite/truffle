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

const affectedAddresses = createSelector(
  [contextSet],

  (contexts) => contexts.addressedContracts()
);

let selector = createStructuredSelector({
  current: currentContext,
  affectedAddresses: affectedAddresses
});
selector.current = currentContext;
selector.affectedAddresses = affectedAddresses;

export default selector;
