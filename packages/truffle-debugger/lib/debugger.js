import debugModule from 'debug';
import expect from "truffle-expect";

import { ContextSet } from "./context";
import Session from "./session";
import SessionView from "./views/session";
import Web3Adapter from "./web3";

const debug = debugModule("debugger:debugger");

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
   * @param {{contracts: Array<Contract>, web3: Web3}} options -
   * @return {Debugger} instance
   */
  static async forTx(txHash, options = {}) {
    expect.options(options, [
      "contracts",
      "web3"
    ]);

    let contexts = ContextSet.forContracts(...options.contracts);

    const adapter = new Web3Adapter(options.web3);
    const { trace, address, binary } = await adapter.getTransactionInfo(txHash);

    const traceContexts = await adapter.gatherContexts(trace, address);

    contexts.add(...traceContexts);

    const call = { address, binary };

    return new this(contexts, trace, call);
  }


  connect() {
    const view = new SessionView(this._contexts, this._trace);
    return new Session(view, this.initialState);
  }

  /**
   * @return {State} initial state for the transaction being debugged
   */
  get initialState() {
    return {
      traceIndex: 0,
      callstack: [this._call]
    }
  }
}
