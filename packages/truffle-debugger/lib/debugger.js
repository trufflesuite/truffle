import debugModule from 'debug';
import expect from "truffle-expect";

import { ContextSet } from "./context";
import Session from "./session";
import Web3Adapter from "./web3";

import traceSelector from "./trace/selectors";
import evmSelector from "./evm/selectors";
import soliditySelector from "./solidity/selectors";
import contextSelector from "./context/selectors";

const debug = debugModule("debugger");

export default class Debugger {
  /**
   * @param {ContextSet} contexts - reference information for debugger
   * @param {Array<TraceStep>} trace - trace information
   * @param {Object} call - initial call (specifies `address` or `binary`)
   * @private
   */
  constructor(contexts, trace, call) {
    this._contexts = contexts;
    this._trace = trace;
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

    let contexts = ContextSet.forContracts(...options.contracts);

    const adapter = new Web3Adapter(options.provider);
    const { trace, address, binary } = await adapter.getTransactionInfo(txHash);
    debug("address: %O", address);

    const traceContexts = await adapter.gatherContexts(trace, address);

    contexts.add(...traceContexts);

    const call = { address, binary };

    return new this(contexts, trace, call);
  }


  /**
   * Connects to the instantiated Debugger.
   *
   * @return {Session} new session instance
   */
  connect() {
    return new Session(this._contexts, this._trace, this.initialState);
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
