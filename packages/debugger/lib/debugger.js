import debugModule from "debug";
const debug = debugModule("debugger");

import Session from "./session";

import { createNestedSelector } from "reselect-tree";

import dataSelector from "./data/selectors";
import astSelector from "./ast/selectors";
import traceSelector from "./trace/selectors";
import evmSelector from "./evm/selectors";
import soliditySelector from "./solidity/selectors";
import sessionSelector from "./session/selectors";
import stacktraceSelector from "./stacktrace/selectors";
import controllerSelector from "./controller/selectors";

import { Compilations } from "@truffle/codec";

const Debugger = {
  /**
   * Instantiates a Debugger for a given transaction hash.
   *
   * @param {String} txHash - transaction hash with leading "0x"
   * @param {{contracts: Array<Artifact>, files: Array<String>, provider: Web3Provider, compilations: Array<Compilation>}} options -
   * @return {Debugger} instance
   */
  forTx: async function(txHash, options = {}) {
    let { contracts, files, provider, compilations, lightMode } = options;
    if (!compilations) {
      compilations = Compilations.Utils.shimArtifacts(contracts, files);
    }
    let session = new Session(compilations, provider, { lightMode }, txHash);

    try {
      await session.ready();
      debug("session ready");
    } catch (e) {
      debug("error occurred, unloaded");
      session.unload();
    }

    return session;
  },

  /*
   * Instantiates a Debugger for a given project (with no transaction loaded)
   *
   * @param {{contracts: Array<Artifact>, files: Array<String>, provider: Web3Provider, compilations: Array<Compilation>}} options -
   * @return {Debugger} instance
   */
  forProject: async function(options = {}) {
    let { contracts, files, provider, compilations, lightMode } = options;
    if (!compilations) {
      compilations = Compilations.Utils.shimArtifacts(contracts, files);
    }
    let session = new Session(compilations, provider, { lightMode });

    await session.ready();

    return session;
  },

  /**
   * Exported selectors
   *
   * See individual selector docs for full listing
   *
   * @example
   * Debugger.selectors.ast.current.tree
   *
   * @example
   * Debugger.selectors.solidity.current.instruction
   *
   * @example
   * Debugger.selectors.trace.steps
   */
  selectors: createNestedSelector({
    ast: astSelector,
    data: dataSelector,
    trace: traceSelector,
    evm: evmSelector,
    solidity: soliditySelector,
    stacktrace: stacktraceSelector,
    session: sessionSelector,
    controller: controllerSelector
  })
};

export default Debugger;
