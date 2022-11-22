import debugModule from "debug";
const debug = debugModule("debugger:ens:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";

const ens = createSelectorTree({
  /**
   * ens.state
   */
  state: state => state.ens,

  /**
   * ens.current
   */
  current: {
    /**
     * ens.current.cache
     */
    cache: createLeaf(["/state"], state => state.proc.cache)
  }
});

export default ens;
