import debugModule from "debug";
const debug = debugModule("debugger:context:selectors");

import { createSelector } from "reselect";
import { createNestedSelector } from "../selectors";

import evm from "../evm/selectors";

const contexts = (state, props) => state.contexts

const forAddress = createSelector(
  [contexts],

  (contexts) => (
    (address) => contexts.list[ contexts.indexForAddress[address] ]
  )
);

const forBinary = createSelector(
  [contexts],

  (contexts) => (
    (binary) => contexts.list[ contexts.indexForBinary[binary] ]
  )
);


const currentContext = createSelector(
  [evm.current.call, forAddress, forBinary],

  ({address, binary}, contextForAddress, contextForBinary) => {
    if (address) {
      return contextForAddress(address);
    } else {
      return contextForBinary(binary);
    }
  }
)

const contextSet = (state, props) => props.contexts

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

let selector = createNestedSelector({
  forAddress,
  forBinary,
  current: currentContext,
  affectedInstances: affectedInstances,
  missingSources: missingSources
});

export default selector;
