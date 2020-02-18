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
import controllerSelector from "./controller/selectors";

import { Compilations } from "@truffle/codec";

/**
 * @example
 * let session = Debugger
 *   .forTx(<txHash>, {
 *     contracts: [<contract obj>, ...],
 *     provider: <provider instance>
 *   })
 *   .connect();
 */
export default class Debugger {
  /**
   * @param {Session} session - debugger session
   * @private
   */
  constructor(session) {
    /**
     * @private
     */
    this._session = session;
  }

  /**
   /**
   * Instantiates a Debugger for a given transaction hash.
   *
   * @param {String} txHash - transaction hash with leading "0x"
   * @param {{contracts: Array<Artifact>, files: Array<String>, provider: Web3Provider, compilations: Array<Compilation>}} options -
   * @return {Debugger} instance
   */
  static async forTx(txHash, options = {}) {
    let { contracts, files, provider, compilations } = options;
    if (!compilations) {
      compilations = Compilations.Utils.shimArtifacts(contracts, files);
    }
    let session = new Session(compilations, provider, txHash);

    try {
      await session.ready();
      debug("session ready");
    } catch (e) {
      debug("error occurred, unloaded");
      session.unload();
    }

    return new this(session);
  }

  /*
   * Instantiates a Debugger for a given project (with no transaction loaded)
   *
   * @param {{contracts: Array<Artifact>, files: Array<String>, provider: Web3Provider, compilations: Array<Compilation>}} options -
   * @return {Debugger} instance
   */
  static async forProject(options = {}) {
    let { contracts, files, provider, compilations } = options;
    if (!compilations) {
      compilations = Compilations.Utils.shimArtifacts(contracts, files);
    }
    let session = new Session(compilations, provider);

    await session.ready();

    return new this(session);
  }

  /**
   * Connects to the instantiated Debugger.
   *
   * @return {Session} session instance
   */
  connect() {
    return this._session;
  }

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
  static get selectors() {
    return createNestedSelector({
      ast: astSelector,
      data: dataSelector,
      trace: traceSelector,
      evm: evmSelector,
      solidity: soliditySelector,
      session: sessionSelector,
      controller: controllerSelector
    });
  }
}
