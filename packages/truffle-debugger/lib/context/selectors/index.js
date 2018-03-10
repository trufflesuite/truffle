import debugModule from "debug";
const debug = debugModule("debugger:context:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";

import evm from "lib/evm/selectors";

const WORD_SIZE = 0x20;

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
        (address) => contexts && contexts.list[ contextIndexBy(address) ]
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
        (binary) => contexts && contexts.list[ contextIndexBy(binary) ]
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

      (contexts) => (
        (address) => {
          const { _next, ...map } = contexts.indexForAddress;
          return map[address];
        }
      )
    ),

    /**
     * context.indexBy.binary
     *
     * object (binary => context list index)
     */
    binary: createLeaf(
      [contexts],

      (contexts) => (
        (binary) => {
          // trim off possible constructor args, one word at a time
          // HACK until there's better CREATE semantics
          let index = undefined;
          while (index === undefined && binary) {
            index = contexts.indexForBinary[binary];
            binary = binary.slice(0, -(WORD_SIZE * 2));
          }

          return index;
        }
      )
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
    [contexts],

    ({list, indexForAddress}) => {
      let map = {};

      for (let address of Object.keys(indexForAddress)) {
        if (address === "_next") continue;

        let index = indexForAddress[address];
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
