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

/**
 * @example
 * let session = Debugger
 *   .forTx(<txHash>, <provider instance>, <compilations>)
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
   * Instantiates a Debugger for a given transaction hash.
   *
   * @param {String} txHash - transaction hash with leading "0x"
   * @param provider: Web3Provider
   * @param compilations: Array<Compilation>
   * @return {Debugger} instance
   */
  static async forTx(txHash, provider, compilations) {
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
   * @param provider: Web3Provider
   * @param compilations: Array<Compilation>
   * @return {Debugger} instance
   */
  static async forProject(provider, compilations) {
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
