import debugModule from "debug";
const debug = debugModule("debugger:session");

import configureStore from "lib/store";

import * as controller from "lib/controller/actions";
import * as actions from "./actions";
import data from "lib/data/selectors";
import { decode } from "lib/data/sagas";
import controllerSelector from "lib/controller/selectors";

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
    let { store, sagaMiddleware } = configureStore(reducer, rootSaga);
    this._store = store;
    this._sagaMiddleware = sagaMiddleware;

    let { contexts, sources } = Session.normalize(contracts, files);

    // record contracts
    this._store.dispatch(actions.recordContracts(contexts, sources));

    this._store.dispatch(actions.start(txHash, provider));
  }

  async ready() {
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
        abi,
        compiler
      } = contract;

      let contractNode = ast.nodes.find(
        node =>
          node.nodeType === "ContractDefinition" && node.name === contractName
      ); //ideally we'd hold this off till later, but that would break the
      //direction of the evm/solidity dependence, so we do it now

      let contractId = contractNode.id;
      let contractKind = contractNode.contractKind;

      debug("contractName %s", contractName);
      debug("sourceMap %o", sourceMap);
      debug("compiler %o", compiler);
      debug("abi %O", abi);

      sourcesByPath[sourcePath] = { sourcePath, source, ast, compiler };

      if (binary && binary != "0x") {
        contexts.push({
          contractName,
          binary,
          sourceMap,
          abi,
          compiler,
          contractId,
          contractKind,
          isConstructor: true
        });
      }

      if (deployedBinary && deployedBinary != "0x") {
        contexts.push({
          contractName,
          binary: deployedBinary,
          sourceMap: deployedSourceMap,
          abi,
          compiler,
          contractId,
          contractKind,
          isConstructor: false
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

  async dispatch(action) {
    this._store.dispatch(action);

    return true;
  }

  /**
   * @private
   * Allows running any saga -- for internal use only!
   * Using this could seriously screw up the debugger state if you
   * don't know what you're doing!
   */
  async _runSaga(saga, ...args) {
    return await this._sagaMiddleware.run(saga, ...args).toPromise();
  }

  async interrupt() {
    return this.dispatch(controller.interrupt());
  }

  async doneStepping(stepperAction) {
    return new Promise(resolve => {
      let hasStarted = false;
      let hasResolved = false;
      const unsubscribe = this._store.subscribe(() => {
        const isStepping = this.view(controllerSelector.isStepping);

        if (isStepping && !hasStarted) {
          hasStarted = true;
          debug("heard step start");
          return;
        }

        if (!isStepping && hasStarted && !hasResolved) {
          hasResolved = true;
          debug("heard step stop");
          unsubscribe();
          resolve(true);
        }
      });
      this.dispatch(stepperAction);
    });
  }

  //Note: count is an optional argument; default behavior is to advance 1
  async advance(count) {
    return await this.doneStepping(controller.advance(count));
  }

  async stepNext() {
    return await this.doneStepping(controller.stepNext());
  }

  async stepOver() {
    return await this.doneStepping(controller.stepOver());
  }

  async stepInto() {
    return await this.doneStepping(controller.stepInto());
  }

  async stepOut() {
    return await this.doneStepping(controller.stepOut());
  }

  async reset() {
    return await this.doneStepping(controller.reset());
  }

  //NOTE: breakpoints is an OPTIONAL argument for if you want to supply your
  //own list of breakpoints; leave it out to use the internal one (as
  //controlled by the functions below)
  async continueUntilBreakpoint(breakpoints) {
    return await this.doneStepping(
      controller.continueUntilBreakpoint(breakpoints)
    );
  }

  async addBreakpoint(breakpoint) {
    this.dispatch(controller.addBreakpoint(breakpoint));
  }

  async removeBreakpoint(breakpoint) {
    return this.dispatch(controller.removeBreakpoint(breakpoint));
  }

  async removeAllBreakpoints() {
    return this.dispatch(controller.removeAllBreakpoints());
  }

  //deprecated -- decode is now *always* ready!
  async decodeReady() {
    return true;
  }

  async variable(name) {
    const definitions = this.view(data.current.identifiers.definitions);
    const refs = this.view(data.current.identifiers.refs);

    return await this._runSaga(decode, definitions[name], refs[name]);
  }

  async variables() {
    let definitions = this.view(data.current.identifiers.definitions);
    let refs = this.view(data.current.identifiers.refs);
    let decoded = {};
    for (let [identifier, ref] of Object.entries(refs)) {
      decoded[identifier] = await this._runSaga(
        decode,
        definitions[identifier],
        ref
      );
    }
    return decoded;
  }
}
