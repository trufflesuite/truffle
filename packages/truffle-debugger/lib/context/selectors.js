import debugModule from "debug";
const debug = debugModule("debugger:context:selectors");

import { createSelector } from "reselect";
import { createNestedSelector } from "../selectors";

import evm from "../evm/selectors";

const contexts = (state) => {
  const defaultView = {
    list: [],
    indexForAddress: {},
    indexForBinary: {}
  };

  return state.context || defaultView;
};

const list = createSelector(
  [contexts],

  (contexts) => contexts.list
);

const indexByAddress = createSelector(
  [contexts],

  (contexts) => {
    const { _next, ...map } = contexts.indexForAddress;
    return map;
  }
);

const indexByBinary = createSelector(
  [contexts],

  (contexts) => contexts.indexForBinary
);

const indexBy = createNestedSelector({
  address: indexByAddress,
  binary: indexByBinary,
});

const byAddress = createSelector(
  [contexts, indexBy.address],

  (contexts, contextIndexBy) => (
    (address) => contexts && contexts.list[ contextIndexBy[address] ]
  )
);

const byBinary = createSelector(
  [contexts, indexBy.binary],

  (contexts, contextIndexBy) => (
    (binary) => contexts && contexts.list[ contextIndexBy[binary] ]
  )
);

const by = createNestedSelector({
  address: byAddress,
  binary: byBinary
});

const currentContext = createSelector(
  [evm.current.call, by],

  ({address, binary}, contextBy) => {
    if (address) {
      return contextBy.address(address);
    } else {
      return contextBy.binary(binary);
    }
  }
)

const affectedInstances = createSelector(
  [list, indexBy.address],

  (list, indexByAddress) => {
    let map = {};

    debug("list: %O", list);
    debug("indexByAddress: %o", indexByAddress);

    for (let address of Object.keys(indexByAddress)) {
      let index = indexByAddress[address];
      let context = list[index];

      map[address] = {
        contractName: context.contractName,
        source: context.source,
        binary: context.binary
      };
    }

    return map;
  }
);

const missingSources = createSelector(
  [affectedInstances],

  (instances) => Object.entries(instances)
    .filter(([address, instance]) => !instance.source)
    .map(([address, instance]) => address)
);

const selector = createNestedSelector({
  list,
  by,
  indexBy,
  current: currentContext,
  affectedInstances: affectedInstances,
  missingSources: missingSources
});

export default selector;
