import debugModule from "debug";
const debug = debugModule("debugger:session:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";

import evm from "lib/evm/selectors";
import solidity from "lib/solidity/selectors";

const session = createSelectorTree({
  /**
   * session.info
   */
  info: {

    /**
     * session.info.affectedInstances
     */
    affectedInstances: createLeaf(
      [evm.info.instances, evm.info.contexts, solidity.info.sources, solidity.info.sourceMaps],

      (instances, contexts, sources, sourceMaps) => Object.assign({},
        ...Object.entries(instances).map(
          ([address, {context}]) => {
            debug("instances %O", instances);
            debug("contexts %O", contexts);
            let { contractName, binary } = contexts[context];
            let { sourceMap } = sourceMaps[context] || {};

            let { source } = sourceMap ?
              // look for source ID between second and third colons (HACK)
              sources[sourceMap.match(/^[^:]+:[^:]+:([^:]+):/)[1]] :
              {};

            return {
              [address]: {
                contractName, source, binary
              }
            };
          }
        )
      )
    )
  }
});

export default session;
