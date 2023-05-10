import debugModule from "debug";
const debug = debugModule("debugger");

import Session from "./session";

import { createNestedSelector } from "reselect-tree";

import dataSelector from "./data/selectors";
import txlogSelector from "./txlog/selectors";
import astSelector from "./ast/selectors";
import traceSelector from "./trace/selectors";
import evmSelector from "./evm/selectors";
import sourcemappingSelector from "./sourcemapping/selectors";
import sessionSelector from "./session/selectors";
import stacktraceSelector from "./stacktrace/selectors";
import controllerSelector from "./controller/selectors";
import ensSelector from "./ens/selectors";

import { Compilations } from "@truffle/codec";

const Debugger = {
  /**
   * Instantiates a Debugger for a given transaction hash.
   * Throws on failure.  If you want a more failure-tolerant method,
   * use forProject and then do a session.load inside a try.
   *
   * @param {String} txHash - transaction hash with leading "0x"
   * @param {{contracts: Array<Artifact>, files: Array<String>, provider: Web3Provider, compilations: Array<Compilation>}} options -
   * @return {Debugger} instance
   */
  forTx: async function (txHash, options = {}) {
    const {
      contracts,
      files,
      provider,
      compilations,
      lightMode,
      storageLookup,
      ens //currently supported options: registryAddress
    } = options;
    if (!compilations) {
      compilations = Compilations.Utils.shimArtifacts(contracts, files);
    }
    let session = new Session(
      compilations,
      provider,
      { lightMode, storageLookup, ens },
      txHash
    );

    await session.ready();

    return session;
  },

  /*
   * Instantiates a Debugger for a given project (with no transaction loaded)
   *
   * @param {{contracts: Array<Artifact>, files: Array<String>, provider: Web3Provider, compilations: Array<Compilation>}} options -
   * @return {Debugger} instance
   */
  forProject: async function (options = {}) {
    const {
      contracts,
      files,
      provider,
      compilations,
      lightMode,
      ens //currently supported options: registryAddress
    } = options;
    if (!compilations) {
      compilations = Compilations.Utils.shimArtifacts(contracts, files);
    }
    let session = new Session(compilations, provider, {
      lightMode,
      ens
    });

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
   * Debugger.selectors.sourcemapping.current.instruction
   *
   * @example
   * Debugger.selectors.trace.steps
   */
  get selectors() {
    return createNestedSelector({
      ast: astSelector,
      data: dataSelector,
      ens: ensSelector,
      txlog: txlogSelector,
      trace: traceSelector,
      evm: evmSelector,
      sourcemapping: sourcemappingSelector,
      stacktrace: stacktraceSelector,
      session: sessionSelector,
      controller: controllerSelector
    });
  }
};

export default Debugger;
