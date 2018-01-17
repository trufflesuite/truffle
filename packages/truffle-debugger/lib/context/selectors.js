import debugModule from "debug";
const debug = debugModule("debugger:selectors:currentContext");

import { createSelector, createStructuredSelector } from "reselect";

import evm from "../evm/selectors";


const contextSet = (state, props) => props.contexts

const currentContext = createSelector(
  [evm.current.call, contextSet],

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
  current: currentContext,
  affectedInstances: affectedInstances,
  missingSources: missingSources
});
selector.current = currentContext;
selector.affectedInstances = affectedInstances;
selector.missingSources = missingSources;

export default selector;
