import debugModule from "debug";
const debug = debugModule("debugger:context:selectors");

import { createSelectorTree, createLeaf } from "lib/selectors";

import evm from "lib/evm/selectors";


const contexts = (state) => {
  const defaultView = {
    list: [],
    indexForAddress: {},
    indexForBinary: {}
  };

  return state.context || defaultView;
};

const context = createSelectorTree({
  /**
   * context.list
   *
   * list of all contexts
   */
  list: createLeaf([contexts], (contexts) => contexts.list),

  /**
   * context.by
   */
  by: {

    /**
     * context.by.address
     *
     * object (address => context)
     */
    address: createLeaf(
      [contexts, "../indexBy/address"],

      (contexts, contextIndexBy) => (
        (address) => contexts && contexts.list[ contextIndexBy[address] ]
      )
    ),

    /**
     * context.by.binary
     *
     * object (binary => context)
     */
    binary: createLeaf(
      [contexts, "../indexBy/binary"],

      (contexts, contextIndexBy) => (
        (address) => contexts && contexts.list[ contextIndexBy[address] ]
      )
    )
  },

  /**
   * context.indexBy
   */
  indexBy: {

    /**
     * context.indexBy.address
     *
     * object (address => context list index)
     */
    address: createLeaf(
      [contexts],

      (contexts) => {
        const { _next, ...map } = contexts.indexForAddress;
        return map;
      }
    ),

    /**
     * context.indexBy.binary
     *
     * object (binary => context list index)
     */
    binary: createLeaf(
      [contexts],

      (contexts) => contexts.indexForBinary
    )
  },

  /**
   * context.current
   */
  current: createLeaf(
    [evm.current.call, "./by"],

    ({address, binary}, contextBy) => {
      if (address) {
        return contextBy.address(address);
      } else {
        return contextBy.binary(binary);
      }
    }
  ),

  /**
   * context.affectedInstances
   *
   * contexts interacted with in trace
   */
  affectedInstances: createLeaf(
    ["./list", "./indexBy/address"],

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
  ),

  /**
   * context.missingSources
   *
   * contexts without source defined
   */
  missingSources: createLeaf(
    ['./affectedInstances'],

    (instances) => Object.entries(instances)
      .filter(([address, instance]) => !instance.source)
      .map(([address, instance]) => address)
  )
});

export default context;
