import debugModule from "debug";
const debug = debugModule("debugger:session:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";

import evm from "lib/evm/selectors";
import solidity from "lib/solidity/selectors";

const session = createSelectorTree({
  /*
   * session.state
   */
  state: state => state.session,

  /**
   * session.info
   */
  info: {
    /**
     * session.info.affectedInstances
     */
    affectedInstances: createLeaf(
      [evm.transaction.instances, evm.info.contexts, solidity.info.sources],

      (instances, contexts, sources) =>
        Object.assign(
          {},
          ...Object.entries(instances).map(([address, { context, binary }]) => {
            debug("instances %O", instances);
            debug("contexts %O", contexts);
            let { contractName, primarySource } = contexts[context];

            let source =
              primarySource !== undefined ? sources[primarySource] : undefined;

            return {
              [address]: {
                contractName,
                source,
                binary
              }
            };
          })
        )
    )
  },

  /**
   * session.transaction (namespace)
   */
  transaction: {
    /**
     * session.transaction (selector)
     * contains the web3 transaction object
     */
    _: createLeaf(["/state"], state => state.transaction),

    /**
     * session.transaction.receipt
     * contains the web3 receipt object
     */
    receipt: createLeaf(["/state"], state => state.receipt),

    /**
     * session.transaction.block
     * contains the web3 block object
     */
    block: createLeaf(["/state"], state => state.block)
  },

  /*
   * session.status (namespace)
   */
  status: {
    /*
     * session.status.readyOrError
     */
    readyOrError: createLeaf(["/state"], state => state.ready),

    /*
     * session.status.ready
     */
    ready: createLeaf(
      ["./readyOrError", "./isError"],
      (readyOrError, error) => readyOrError && !error
    ),

    /*
     * session.status.waiting
     */
    waiting: createLeaf(["/state"], state => !state.ready),

    /*
     * session.status.error
     */
    error: createLeaf(["/state"], state => state.lastLoadingError),

    /*
     * session.status.isError
     */
    isError: createLeaf(["./error"], error => error !== null),

    /*
     * session.status.success
     */
    success: createLeaf(["./error"], error => error === null),

    /*
     * session.status.errored
     */
    errored: createLeaf(
      ["./readyOrError", "./isError"],
      (readyOrError, error) => readyOrError && error
    )
  }
});

export default session;
