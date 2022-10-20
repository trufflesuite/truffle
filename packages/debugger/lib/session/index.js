import debugModule from "debug";
const debug = debugModule("debugger:session");

import * as Abi from "@truffle/abi-utils";
import * as Codec from "@truffle/codec";
import { keccak256, stableKeccak256 } from "lib/helpers";

import configureStore from "lib/store";

import * as controller from "lib/controller/actions";
import * as actions from "./actions";
import data from "lib/data/selectors";
import txlog from "lib/txlog/selectors";
import stacktrace from "lib/stacktrace/selectors";
import session from "lib/session/selectors";
import * as dataSagas from "lib/data/sagas";
import * as controllerSagas from "lib/controller/sagas";
import * as sagas from "./sagas";
import controllerSelector from "lib/controller/selectors";

import { createNestedSelector } from "reselect-tree";

import ast from "lib/ast/selectors";
import trace from "lib/trace/selectors";
import evm from "lib/evm/selectors";
import sourcemapping from "lib/sourcemapping/selectors";

import rootSaga from "./sagas";
import reducer from "./reducers";

import { Shims } from "@truffle/compile-common";

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
    const { store, sagaMiddleware } = configureStore(reducer, rootSaga, [
      moduleOptions
    ]);
    this._store = store;
    this._sagaMiddleware = sagaMiddleware;

    const { contexts, sources, contracts } = Session.normalize(compilations);

    // record contracts
    this._store.dispatch(actions.recordContracts(contexts, sources, contracts));

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
    let sources = {
      user: {}, //by compilation
      internal: {} //by context
    };
    let contracts = {}; //other info such as ABIs

    //we're actually going to ignore the passed-in IDs and make our own.
    //note we'll set contextHash to null for user sources, and only set it
    //for internal sources.
    const makeSourceId = (compilationId, contextHash, index) =>
      stableKeccak256({ compilationId, contextHash, index });

    for (const compilation of compilations) {
      if (compilation.unreliableSourceOrder) {
        throw new Error(
          `Error: Compilation ${compilation.id} has unreliable source order.`
        );
      }
      const compiler = compilation.compiler; //note: we'll prefer one listed on contract or source
      const settings = compilation.settings; //same note
      sources.user[compilation.id] = [];
      contracts[compilation.id] = {};
      for (let index in compilation.sources) {
        //not the recommended way to iterate over an array,
        //but the order doesn't matter here so it's safe
        index = Number(index); //however due to the use of in we must explicitly convert to number
        let source = compilation.sources[index];
        if (!source) {
          continue; //just for safety (in case there are gaps)
        }
        let ast = source.ast;
        if (ast && !ast.nodeType) {
          ast = undefined; //HACK: remove Vyper asts for now
        }
        sources.user[compilation.id][index] = {
          ...source,
          ast,
          compiler: source.compiler || compiler,
          settings: source.settings || settings,
          compilationId: compilation.id,
          index,
          id: makeSourceId(compilation.id, null, index),
          internal: false
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
          settings,
          primarySourceId,
          generatedSources,
          deployedGeneratedSources
        } = contract;
        debug("contractName: %s", contractName);

        //hopefully we can get rid of this step eventually, but not yet
        if (typeof binary === "object") {
          binary = Shims.NewToLegacy.forBytecode(binary);
        }
        if (typeof deployedBinary === "object") {
          deployedBinary = Shims.NewToLegacy.forBytecode(deployedBinary);
        }

        let primarySourceIndex;
        if (primarySourceId !== undefined) {
          //I'm assuming this finds it! it had better!
          primarySourceIndex = compilation.sources.findIndex(
            source => source && source.id === primarySourceId
          );
        }
        //otherwise leave it undefined
        let primaryLanguage;
        if (primarySourceIndex !== undefined) {
          primaryLanguage = compilation.sources[primarySourceIndex].language;
        }
        //leave undefined if can't locate primary source

        //now: we need to find the contract node.
        //note: ideally we'd hold this off till later, but that would break the
        //direction of the evm/sourcemapping dependence, so we do it now
        const contractNode = Codec.Compilations.Utils.getContractNode(
          contract,
          compilation
        );

        const contractId = contractNode ? contractNode.id : undefined;
        const contractKind = contractNode
          ? contractNode.contractKind
          : undefined;
        const linearizedBaseContracts = contractNode
          ? contractNode.linearizedBaseContracts
          : undefined;
        abi = Abi.normalize(abi); //let's handle this up front

        debug("contractName %s", contractName);
        debug("sourceMap %o", sourceMap);
        debug("compiler %o", compiler);
        debug("abi %o", abi);

        if (contractId) {
          contracts[compilation.id][contractId] = {
            compilationId: compilation.id,
            contractId,
            abi,
            //set context hashes temporarily to null; they'll be set for real below
            //if they exist
            deployedContext: null,
            constructorContext: null
            //things to consider adding in the future:
            //primarySource, contractName, compiler, contractKind,
            //linearizedBaseContracts, primaryLanguage
          };
        }

        //note: simpleShimSourceMap does not handle the case where we can't just extract
        //the Solidity-style source map
        sourceMap = Codec.Compilations.Utils.simpleShimSourceMap(sourceMap);
        deployedSourceMap =
          Codec.Compilations.Utils.simpleShimSourceMap(deployedSourceMap);

        if (binary && binary != "0x") {
          //NOTE: we take hash as *string*, not as bytes, because the binary may
          //contain link references!
          const contextHash = keccak256({
            type: "string",
            value: binary
          });
          contexts.push({
            context: contextHash,
            contractName,
            binary,
            sourceMap,
            primarySource: primarySourceIndex,
            abi,
            compiler,
            settings,
            compilationId: compilation.id,
            contractId,
            contractKind,
            linearizedBaseContracts,
            primaryLanguage,
            isConstructor: true
          });
          if (generatedSources) {
            sources.internal[contextHash] = [];
            for (let index in generatedSources) {
              index = Number(index); //it comes out as a string due to in, so let's fix that
              const source = generatedSources[index];
              // VSCode extension breaks w/o this check
              if (source) {
                sources.internal[contextHash][index] = {
                  ...source,
                  compiler: source.compiler || compiler,
                  settings: source.settings || settings,
                  compilationId: compilation.id,
                  index,
                  id: makeSourceId(compilation.id, contextHash, index),
                  internal: true,
                  internalFor: contextHash
                };
              }
            }
          }
          if (contractId) {
            contracts[compilation.id][contractId].constructorContext =
              contextHash;
          }
        }

        if (deployedBinary && deployedBinary != "0x") {
          //NOTE: we take hash as *string*, not as bytes, because the binary may
          //contain link references!
          const contextHash = keccak256({
            type: "string",
            value: deployedBinary
          });
          contexts.push({
            context: contextHash,
            contractName,
            binary: deployedBinary,
            sourceMap: deployedSourceMap,
            primarySource: primarySourceIndex,
            immutableReferences,
            abi,
            compiler,
            settings,
            compilationId: compilation.id,
            contractId,
            contractKind,
            linearizedBaseContracts,
            primaryLanguage,
            isConstructor: false
          });
          if (deployedGeneratedSources) {
            sources.internal[contextHash] = [];
            for (let index in deployedGeneratedSources) {
              index = Number(index); //it comes out as a string due to in, so let's fix that
              const source = deployedGeneratedSources[index];
              // VSCode extension breaks w/o this check
              if (source) {
                sources.internal[contextHash][index] = {
                  ...source,
                  compiler: source.compiler || compiler,
                  settings: source.settings || settings,
                  compilationId: compilation.id,
                  index,
                  id: makeSourceId(compilation.id, contextHash, index),
                  internal: true,
                  internalFor: contextHash
                };
              }
            }
          }
          if (contractId) {
            contracts[compilation.id][contractId].deployedContext = contextHash;
          }
        }
      }
    }

    //now: turn contexts from array into object
    contexts = Object.assign(
      {},
      ...contexts.map(context => ({
        [context.context]: {
          ...context
        }
      }))
    );

    //normalize contexts
    //HACK: the type of contexts doesn't actually match!!
    //fortunately it's good enough to work
    contexts = Codec.Contexts.Utils.normalizeContexts(contexts);

    return { contexts, sources, contracts };
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
          return;
        }

        if (!isStepping && hasStarted) {
          unsubscribe();
          resolve(true);
        }
      });
      this.dispatch(stepperAction);
    });
  }

  //returns true on success, false on already loaded; throws on failure
  async load(txHash, loadOptions = {}) {
    if (this.view(session.status.loaded)) {
      return false;
    }
    return await this.readyAgainAfterLoading(
      actions.loadTransaction(txHash, loadOptions)
    );
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

  //Run the debugger till the end
  async runToEnd() {
    return await this.dispatch(controller.runToEnd());
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

  async setInternalStepping(active) {
    return await this.dispatch(controller.setInternalStepping(active));
  }

  //deprecated -- decode is now *always* ready!
  async decodeReady() {
    return true;
  }

  async variable(name) {
    const definitions = this.view(data.current.identifiers.definitions);
    const refs = this.view(data.current.identifiers.refs);
    const compilationId = this.view(data.current.compilationId);
    debug("name: %s", name);
    debug("refs: %O", refs);
    debug("definitions: %o", definitions);

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

  async returnValue() {
    if (
      !this.view(session.status.loaded) ||
      !this.view(evm.current.step.isHalting)
    ) {
      return null;
    }
    return await this._runSaga(dataSagas.decodeReturnValue);
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

  async addExternalCompilations(compilations) {
    const { contexts, sources, contracts } = Session.normalize(compilations);
    return await this.dispatch(
      actions.addCompilations(sources, contexts, contracts)
    );
  }

  async startFullMode() {
    return await this.dispatch(actions.startFullMode());
  }

  get selectors() {
    return createNestedSelector({
      ast,
      data,
      txlog,
      trace,
      evm,
      sourcemapping,
      stacktrace,
      session,
      controller: controllerSelector
    });
  }
}
