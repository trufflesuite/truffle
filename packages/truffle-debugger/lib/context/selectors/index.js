import debugModule from "debug";
const debug = debugModule("debugger:context:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";

import evm from "lib/evm/selectors";

const WORD_SIZE = 0x20;

const context = createSelectorTree({
  /**
   * context.list
   *
   * list of all contexts
   */
  list: (state) => state.context || [],

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
      ["/list", "../indexBy/address"],

      (list, contextIndexBy) => (
        (address) => list[ contextIndexBy(address) ]
      )
    ),

    /**
     * context.by.binary
     *
     * object (binary => context)
     */
    binary: createLeaf(
      ["/list", "../indexBy/binary"],

      (list, contextIndexBy) => (
        (binary) => list[ contextIndexBy(binary) ]
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
      ["/list"],

      (list) => {
        let map = Object.assign({},
          ...list.map(
            (context, index) => Object.assign({},
              ...context.addresses.map( (address) => ({ [address]: index }) )
            )
          )
        );

        return (address) => map[address]
      }
    ),

    /**
     * context.indexBy.binary
     *
     * object (binary => context list index)
     */
    binary: createLeaf(
      ["/list"],

      (list) => {
        let map = Object.assign({},
          ...list.map(
            (context, index) => ({ [context.binary]: index })
          )
        );

        return (binary) => {
          // trim off possible constructor args, one word at a time
          // HACK until there's better CREATE semantics
          let index = undefined;
          while (index === undefined && binary) {
            index = map[binary];
            binary = binary.slice(0, -(WORD_SIZE * 2));
          }

          return index;
        }
      }
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
    ["/list"],

    (list) => Object.assign({},
      ...list.map(
        (context) => Object.assign({},
          ...context.addresses.map(
            (address) => ({
              [address]: {
                contractName: context.contractName,
                source: context.source,
                binary: context.binary
              }
            })
          )
        )
      )
    )
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
