import debugModule from "debug";
const debug = debugModule("debugger:session"); //eslint-disable-line no-unused-vars

import configureStore from "lib/store";

import * as controller from "lib/controller/actions";
import * as actions from "./actions";
import data from "lib/data/selectors";

import rootSaga from "./sagas";
import reducer from "./reducers";

/**
 * Debugger Session
 */
export default class Session {
  /**
   * @param {Array<Contract>} contracts - contract definitions
   * @param {Array<String>} files - array of filenames for sourceMap indexes
   * @param {string} txHash - transaction hash
   * @param {Web3Provider} provider - web3 provider
   * @private
   */
  constructor(contracts, files, txHash, provider) {
    /**
     * @private
     */
    this._store = configureStore(reducer, rootSaga);

    let { contexts, sources } = Session.normalize(contracts, files);

    // record contracts
    this._store.dispatch(actions.recordContracts(contexts, sources));

    this._store.dispatch(actions.start(txHash, provider));
  }

  ready() {
    return new Promise((accept, reject) => {
      this._store.subscribe(() => {
        if (this.state.session.status == "ACTIVE") {
          accept();
        } else if (typeof this.state.session.status == "object") {
          reject(this.state.session.status.error);
        }
      });
    });
  }

  /**
   * Split up artifacts into "contexts" and "sources", dividing artifact
   * data into appropriate buckets.
   *
   * Multiple contracts can be defined in the same source file, but have
   * different bytecodes.
   *
   * This iterates over the contracts and collects binaries separately
   * from sources, using the optional `files` argument to force
   * source ordering.
   * @private
   */
  static normalize(contracts, files = null) {
    let sourcesByPath = {};
    let contexts = [];
    let sources;

    for (let contract of contracts) {
      let {
        contractName,
        binary,
        sourceMap,
        deployedBinary,
        deployedSourceMap,
        sourcePath,
        source,
        ast,
        compiler
      } = contract;

      debug("sourceMap %o", sourceMap);
      debug("compiler %o", compiler);

      sourcesByPath[sourcePath] = { sourcePath, source, ast };

      if (binary && binary != "0x") {
        contexts.push({
          contractName,
          binary,
          sourceMap
        });
      }

      if (deployedBinary && deployedBinary != "0x") {
        contexts.push({
          contractName,
          binary: deployedBinary,
          sourceMap: deployedSourceMap,
          compiler
        });
      }
    }

    if (!files) {
      sources = Object.values(sourcesByPath);
    } else {
      sources = files.map(file => sourcesByPath[file]);
    }

    return { contexts, sources };
  }

  get state() {
    return this._store.getState();
  }

  view(selector) {
    return selector(this.state);
  }

  dispatch(action) {
    this._store.dispatch(action);

    return true;
  }

  interrupt() {
    return this.dispatch(controller.interrupt());
  }

  advance() {
    return this.dispatch(controller.advance());
  }

  stepNext() {
    return this.dispatch(controller.stepNext());
  }

  stepOver() {
    return this.dispatch(controller.stepOver());
  }

  stepInto() {
    return this.dispatch(controller.stepInto());
  }

  stepOut() {
    return this.dispatch(controller.stepOut());
  }

  reset() {
    return this.dispatch(controller.reset());
  }

  continueUntilBreakpoint() {
    return this.dispatch(controller.continueUntilBreakpoint());
  }

  addBreakpoint(breakpoint) {
    return this.dispatch(controller.addBreakpoint(breakpoint));
  }

  removeBreakpoint(breakpoint) {
    return this.dispatch(controller.removeBreakpoint(breakpoint));
  }


  removeAllBreakpoints() {
    return this.dispatch(controller.removeAllBreakpoints());

  async decodeReady() {
    return new Promise(resolve => {
      let haveResolved = false;
      const unsubscribe = this._store.subscribe(() => {
        const subscriptionDecodingStarted = this.view(
          data.proc.decodingMappingKeys
        );

        debug("following decoding started: %d", subscriptionDecodingStarted);

        if (subscriptionDecodingStarted <= 0 && !haveResolved) {
          haveResolved = true;
          unsubscribe();
          resolve();
        }
      });

      const decodingStarted = this.view(data.proc.decodingMappingKeys);

      debug("initial decoding started: %d", decodingStarted);

      if (decodingStarted <= 0) {
        haveResolved = true;
        unsubscribe();
        resolve();
      }
    });
  }

  async variable(name) {
    await this.decodeReady();

    const definitions = this.view(data.current.identifiers.definitions);
    const refs = this.view(data.current.identifiers.refs);

    const decode = this.view(data.views.decoder);
    return await decode(definitions[name], refs[name]);
  }

  async variables() {
    await this.decodeReady();

    return await this.view(data.current.identifiers.decoded);
  }
}
