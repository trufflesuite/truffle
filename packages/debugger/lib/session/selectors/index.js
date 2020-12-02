import debugModule from "debug";
const debug = debugModule("debugger:session:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";

import evm from "lib/evm/selectors";
import trace from "lib/trace/selectors";
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
     * NOTE: this really belongs in session.transaction,
     * but that would be a breaking change
     */
    affectedInstances: createLeaf(
      [
        evm.transaction.affectedInstances,
        evm.info.contexts,
        solidity.info.sources
      ],

      (instances, contexts, sources) =>
        Object.assign(
          {},
          ...Object.entries(instances).map(
            ([
              address,
              {
                context: contextId,
                binary,
                creationBinary,
                creationContext: creationContextId
              }
            ]) => {
              debug("instances %O", instances);
              debug("contexts %O", contexts);
              let context = contexts[contextId];
              if (!context) {
                return { [address]: { binary } };
              }
              let { contractName, compilationId, primarySource } = context;

              debug("primarySource: %o", primarySource);
              debug("compilationId: %s", compilationId);
              debug("sources: %o", sources);

              let source =
                primarySource !== undefined // note this is an index, not an ID
                  ? sources.byCompilationId[compilationId].byIndex[
                      primarySource
                    ]
                  : undefined;

              let constructorArgs;
              if (creationBinary !== undefined) {
                let creationContext = contexts[creationContextId];
                if (creationContext) {
                  //slice off the bytecode part of the constructor to leave the arguments
                  constructorArgs = creationBinary.slice(
                    creationContext.binary.length
                  );
                }
              }

              return {
                [address]: {
                  contractName,
                  source,
                  binary,
                  constructorArgs //will be defined only if created by this tx
                }
              };
            }
          )
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

  /**
   * session.status (namespace)
   */
  status: {
    /**
     * session.status.readyOrError
     */
    readyOrError: createLeaf(["/state"], state => state.ready),

    /**
     * session.status.ready
     */
    ready: createLeaf(
      ["./readyOrError", "./isError"],
      (readyOrError, error) => readyOrError && !error
    ),

    /**
     * session.status.waiting
     */
    waiting: createLeaf(["/state"], state => !state.ready),

    /**
     * session.status.error
     */
    error: createLeaf(["/state"], state => state.lastLoadingError),

    /**
     * session.status.isError
     */
    isError: createLeaf(["./error"], error => error !== null),

    /**
     * session.status.success
     */
    success: createLeaf(["./error"], error => error === null),

    /**
     * session.status.errored
     */
    errored: createLeaf(
      ["./readyOrError", "./isError"],
      (readyOrError, error) => readyOrError && error
    ),

    /**
     * session.status.loaded
     */
    loaded: createLeaf([trace.loaded], loaded => loaded),

    /**
     * session.status.lightMode
     */
    lightMode: createLeaf(["/state"], state => state.lightMode)
  }
});

export default session;
