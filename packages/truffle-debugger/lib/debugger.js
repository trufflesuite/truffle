import debugModule from 'debug';
import expect from "truffle-expect";

import Session from "./session";
import Web3Adapter from "./web3";

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
  constructor(contracts, trace, traceContexts, call) {
    this._contracts = contracts;
    this._trace = trace;
    this._traceContexts = traceContexts;
    this._call = call;
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

    const adapter = new Web3Adapter(options.provider);
    const { trace, address, binary } = await adapter.getTransactionInfo(txHash);
    debug("address: %O", address);

    const traceContexts = await adapter.gatherContexts(trace, address);

    const call = { address, binary };

    return new this(options.contracts, trace, traceContexts, call);
  }


  /**
   * Connects to the instantiated Debugger.
   *
   * @return {Session} new session instance
   */
  connect() {
    return new Session(
      this._contracts, this._trace, this._traceContexts, this.initialState
    );
  }

  /**
   * @return {State} initial state for the transaction being debugged
   */
  get initialState() {
    return {
      trace: {
        index: 0
      },
      evm: {
        callstack: [this._call]
      }
    }
  }

  static get selectors() {
    return {
      trace: traceSelector,
      evm: evmSelector,
      solidity: soliditySelector,
      context: contextSelector
    };
  }
}
