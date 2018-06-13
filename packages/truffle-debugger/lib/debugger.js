import debugModule from 'debug';
import expect from "truffle-expect";

import Session from "./session";

import { createNestedSelector } from "reselect-tree";

import dataSelector from "./data/selectors";
import astSelector from "./ast/selectors";
import traceSelector from "./trace/selectors";
import evmSelector from "./evm/selectors";
import soliditySelector from "./solidity/selectors";
import sessionSelector from "./session/selectors";

const debug = debugModule("debugger");

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
   * Instantiates a Debugger for a given transaction hash.
   *
   * @param {String} txHash - transaction hash with leading "0x"
   * @param {{contracts: Array<Contract>, files: Array<String>, provider: Web3Provider}} options -
   * @return {Debugger} instance
   */
  static async forTx(txHash, options = {}) {
    expect.options(options, [
      "contracts",
      "provider"
    ]);

    let session = new Session(
      options.contracts, options.files,
      txHash, options.provider
    );

    try {
      await session.ready();
    } catch (e) {
      throw e;
    }

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
    });
  }
}

/**
 * @typedef {Object} Contract
 * @property {string} contractName contract name
 * @property {string} source solidity source code
 * @property {string} sourcePath path to source file
 * @property {string} binary 0x-prefixed hex string with create bytecode
 * @property {string} sourceMap solidity source map for create bytecode
 * @property {Object} ast Abstract Syntax Tree from Solidity
 * @property {string} deployedBinary 0x-prefixed compiled binary (on chain)
 * @property {string} deployedSourceMap solidity source map for on-chain bytecode
 */
