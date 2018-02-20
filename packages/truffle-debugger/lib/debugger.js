import debugModule from 'debug';
import expect from "truffle-expect";

import Session from "./session";

import { createNestedSelector } from "./selectors";

import dataSelector from "./data/selectors";
import astSelector from "./ast/selectors";
import traceSelector from "./trace/selectors";
import evmSelector from "./evm/selectors";
import soliditySelector from "./solidity/selectors";
import contextSelector from "./context/selectors";

const debug = debugModule("debugger");

export default class Debugger {
  /**
   * @param {Array<Contract>} contracts - contract definitions
   * @param {Array<TraceStep>} trace - trace information
   * @param {Array<Context>} traceContexts - address and binary for contexts addressed in trace
   * @param {Object} call - initial call (specifies `address` or `binary`)
   * @private
   */
  constructor(session) {
    this._session = session;
  }

  /**
   * Instantiates a Debugger for a given transaction hash.
   *
   * @param {String} txHash - transaction hash with leading "0x"
   * @param {{contracts: Array<Contract>, provider: Web3Provider}} options -
   * @return {Debugger} instance
   */
  static async forTx(txHash, options = {}) {
    expect.options(options, [
      "contracts",
      "provider"
    ]);

    let session = new Session(
      options.contracts, txHash, options.provider
    );

    await session.ready();

    return new this(session);
  }


  /**
   * Connects to the instantiated Debugger.
   *
   * @return {Session} new session instance
   */
  connect() {
    return this._session;
  }

  static get selectors() {
    return createNestedSelector({
      ast: astSelector,
      data: dataSelector,
      trace: traceSelector,
      evm: evmSelector,
      solidity: soliditySelector,
      context: contextSelector
    });
  }
}
