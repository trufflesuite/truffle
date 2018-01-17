import debugModule from "debug";
const debug = debugModule("debugger:selectors:currentContext");

import { createSelector, createStructuredSelector } from "reselect";

const contextSet = (state, props) => props.contexts

const callstack = (state, props) => state.evm.callstack;

const currentCall = createSelector(
  [callstack],

  (stack) => stack.length ? stack[stack.length - 1] : {}
)

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

const missingSources = createSelector(
  [affectedInstances],

  (instances) => Object.entries(instances)
    .filter(([address, instance]) => !instance.source)
    .map(([address, instance]) => address)
);

let selector = createStructuredSelector({
  callstack: callstack,
  current: currentContext,
  affectedInstances: affectedInstances,
  missingSources: missingSources
});
selector.callstack = callstack;
selector.current = currentContext;
selector.affectedInstances = affectedInstances;
selector.missingSources = missingSources;

export default selector;
