import debugModule from "debug";
const debug = debugModule("debugger:session");

import * as Codec from "@truffle/codec";

import configureStore from "lib/store";

import * as controller from "lib/controller/actions";
import * as actions from "./actions";
import data from "lib/data/selectors";
import stacktrace from "lib/stacktrace/selectors";
import session from "lib/session/selectors";
import * as dataSagas from "lib/data/sagas";
import * as controllerSagas from "lib/controller/sagas";
import * as sagas from "./sagas";
import controllerSelector from "lib/controller/selectors";

import ast from "lib/ast/selectors";
import trace from "lib/trace/selectors";
import evm from "lib/evm/selectors";
import solidity from "lib/solidity/selectors";

import rootSaga from "./sagas";
import reducer from "./reducers";

import { shimBytecode } from "@truffle/compile-solidity/legacy/shims";

/**
 * Debugger Session
 */
export default class Session {
  /**
   * @param {Array<Compilations>} compilations
   * @param {Web3Provider} provider - web3 provider
   * txHash parameter is now optional!
   * @private
   */
  constructor(compilations, provider, moduleOptions, txHash) {
    /**
     * @private
     */
    let { store, sagaMiddleware } = configureStore(reducer, rootSaga, [
      moduleOptions
    ]);
    this._store = store;
    this._sagaMiddleware = sagaMiddleware;

    let { contexts, sources } = Session.normalize(compilations);

    // record contracts
    this._store.dispatch(actions.recordContracts(contexts, sources));

    //set up the ready listener
    this._ready = new Promise((accept, reject) => {
      const unsubscribe = this._store.subscribe(() => {
        if (this.view(session.status.ready)) {
          debug("ready!");
          unsubscribe();
          accept();
        } else if (this.view(session.status.errored)) {
          debug("error!");
          unsubscribe();
          reject(this.view(session.status.error));
        }
      });
    });

    //note that txHash is now optional
    this._store.dispatch(actions.start(provider, txHash));
  }

  async ready() {
    await this._ready;
  }

  async readyAgainAfterLoading(sessionAction) {
    return new Promise((accept, reject) => {
      let hasStartedWaiting = false;
      debug("reready listener set up");
      const unsubscribe = this._store.subscribe(() => {
        debug("reready?");
        if (hasStartedWaiting) {
          if (this.view(session.status.ready)) {
            debug("reready!");
            unsubscribe();
            accept(true);
          } else if (this.view(session.status.errored)) {
            unsubscribe();
            debug("error!");
            reject(this.view(session.status.error));
          }
        } else {
          if (this.view(session.status.waiting)) {
            debug("started waiting");
            hasStartedWaiting = true;
          }
          return;
        }
      });
      this.dispatch(sessionAction);
    });
  }

  /**
   * Split up artifacts into "contexts" and "sources", dividing artifact
   * data into appropriate buckets.
   *
   * Multiple contracts can be defined in the same source file, but have
   * different bytecodes.
   *
   * (NOTE: now that this takes compilations, the splitting is largely already
   * done.  However, there's still remaining work to do.)
   *
   * @private
   */
  static normalize(compilations) {
    let contexts = [];
    let sources = {}; //by compilation, then index

    for (let compilation of compilations) {
      if (compilation.unreliableSourceOrder) {
        throw new Error(
          `Error: Compilation ${compilation.id} has unreliable source order.`
        );
      }
      let compiler = compilation.compiler; //note: we'll prefer one listed on contract or source
      sources[compilation.id] = [];
      for (let index in compilation.sources) {
        //not the recommended way to iterate over an array,
        //but the order doesn't matter here so it's safe
        let source = compilation.sources[index];
        if (!source) {
          continue; //just for safety (in case there are gaps)
        }
        sources[compilation.id][index] = {
          ...source,
          compiler: source.compiler || compiler,
          compilationId: compilation.id,
          id: index
        };
      }

      for (let contract of compilation.contracts) {
        let {
          contractName,
          bytecode: binary,
          sourceMap,
          deployedBytecode: deployedBinary,
          deployedSourceMap,
          immutableReferences,
          abi,
          compiler,
          primarySourceId
        } = contract;

        //hopefully we can get rid of this step eventually, but not yet
        if (typeof binary === "object") {
          binary = shimBytecode(binary);
        }
        if (typeof deployedBinary === "object") {
          deployedBinary = shimBytecode(deployedBinary);
        }

        let primarySourceIndex;
        if (primarySourceId !== undefined) {
          //I'm assuming this finds it! it had better!
          primarySourceIndex = compilation.sources.findIndex(
            source => source && source.id === primarySourceId
          );
        }
        //otherwise leave it undefined

        //now: we need to find the contract node.
        //note: ideally we'd hold this off till later, but that would break the
        //direction of the evm/solidity dependence, so we do it now
        let contractNode = Codec.Compilations.Utils.getContractNode(
          contract,
          compilation
        );

        let contractId = contractNode ? contractNode.id : undefined;
        let contractKind = contractNode ? contractNode.contractKind : undefined;
        abi = Codec.AbiData.Utils.schemaAbiToAbi(abi); //let's handle this up front

        debug("contractName %s", contractName);
        debug("sourceMap %o", sourceMap);
        debug("compiler %o", compiler);
        debug("abi %O", abi);

        if (binary && binary != "0x") {
          contexts.push({
            contractName,
            binary,
            sourceMap,
            primarySource: primarySourceIndex,
            abi,
            compiler,
            compilationId: compilation.id,
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
            primarySource: primarySourceIndex,
            immutableReferences,
            abi,
            compiler,
            compilationId: compilation.id,
            contractId,
            contractKind,
            isConstructor: false
          });
        }
      }
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
    await this.dispatch(actions.interrupt());
    await this.dispatch(controller.interrupt());
  }

  async doneStepping(stepperAction) {
    return new Promise(resolve => {
      let hasStarted = false;
      const unsubscribe = this._store.subscribe(() => {
        const isStepping = this.view(controllerSelector.isStepping);

        if (isStepping && !hasStarted) {
          hasStarted = true;
          debug("heard step start");
          return;
        }

        if (!isStepping && hasStarted) {
          debug("heard step stop");
          unsubscribe();
          resolve(true);
        }
      });
      this.dispatch(stepperAction);
    });
  }

  //returns true on success, false on already loaded, error object on failure
  async load(txHash) {
    if (this.view(session.status.loaded)) {
      return false;
    }
    try {
      return await this.readyAgainAfterLoading(actions.loadTransaction(txHash));
    } catch (e) {
      this._runSaga(sagas.unload);
      return e;
    }
  }

  //returns true on success, false on already unloaded
  async unload() {
    if (!this.view(session.status.loaded)) {
      return false;
    }
    debug("unloading");
    await this._runSaga(sagas.unload);
    return true;
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
    let loaded = this.view(session.status.loaded);
    if (!loaded) {
      return;
    }
    return await this._runSaga(controllerSagas.reset);
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
    return await this.dispatch(controller.addBreakpoint(breakpoint));
  }

  async removeBreakpoint(breakpoint) {
    return await this.dispatch(controller.removeBreakpoint(breakpoint));
  }

  async removeAllBreakpoints() {
    return await this.dispatch(controller.removeAllBreakpoints());
  }

  //deprecated -- decode is now *always* ready!
  async decodeReady() {
    return true;
  }

  async variable(name) {
    const definitions = this.view(data.current.identifiers.definitions);
    const refs = this.view(data.current.identifiers.refs);
    const compilationId = this.view(data.current.compilationId);

    return await this._runSaga(
      dataSagas.decode,
      definitions[name],
      refs[name],
      compilationId
    );
  }

  async variables() {
    if (!this.view(session.status.loaded)) {
      return {};
    }
    let definitions = this.view(data.current.identifiers.definitions);
    let refs = this.view(data.current.identifiers.refs);
    let compilationId = this.view(data.current.compilationId);
    let decoded = {};
    for (let [identifier, ref] of Object.entries(refs)) {
      if (identifier in definitions) {
        decoded[identifier] = await this._runSaga(
          dataSagas.decode,
          definitions[identifier],
          ref,
          compilationId
        );
      }
    }
    return decoded;
  }

  callstack() {
    if (!this.view(session.status.loaded)) {
      return null;
    }
    return this.view(stacktrace.current.report);
  }

  stacktrace() {
    if (!this.view(session.status.loaded)) {
      return null;
    }
    return this.view(stacktrace.current.finalReport);
  }

  connect() {
    return this; //for compatibility
  }

  get selectors() {
    return createNestedSelector({
      ast,
      data,
      trace,
      evm,
      solidity,
      stacktrace,
      session,
      controller: controllerSelector
    });
  }
}
