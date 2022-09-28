import debugModule from "debug";
const debug = debugModule("debugger:txlog:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";

import data from "lib/data/selectors";
import evm from "lib/evm/selectors";
import trace from "lib/trace/selectors";
import sourcemapping from "lib/sourcemapping/selectors";

import * as Codec from "@truffle/codec";

const identity = x => x;

function createMultistepSelectors(stepSelector) {
  return {
    /**
     * .source
     * HACK: see notes in sourcemapping selectors about cases
     * where this won't work
     */
    source: createLeaf([stepSelector.source], identity),

    /**
     * .astNode
     * HACK: see notes in sourcemapping selectors about cases
     * where this won't work
     */
    astNode: createLeaf([stepSelector.node], identity),

    /**
     * .inInternalSourceOrYul
     */
    inInternalSourceOrYul: createLeaf(
      ["./source", "./astNode"],
      (source, node) =>
        !node ||
        source.internal ||
        node.nodeType.startsWith("Yul") ||
        node.nodeType === "ContractDefinition" //HACK
      //HACK: this last case is to handle a Solidity bug where code that
      //should be unmapped instead gets mapped to the to the contract
      //definition node.  I'm worried that this might screw things up for
      //optimized code, but... we'll see?
    )
  };
}

let txlog = createSelectorTree({
  /**
   * txlog.state
   */
  state: state => state.txlog,

  /**
   * txlog.proc
   */
  proc: {
    /**
     * txlog.proc.transactionLog
     */
    transactionLog: createLeaf(
      ["/state"],
      state => state.proc.transactionLog.byPointer
    )
  },

  /**
   * txlog.transaction
   */
  transaction: {
    /**
     * txlog.transaction.origin
     */
    origin: createLeaf([evm.transaction.globals.tx], tx => tx.origin),

    /**
     * txlog.transaction.initialCall
     */
    initialCall: createLeaf(["/state"], state => state.transaction.initialCall),

    /**
     * txlog.transaction.absorbFirstInternalCall
     */
    absorbFirstInternalCall: createLeaf(
      [sourcemapping.transaction.bottomStackframeRequiresPhantomFrame],
      identity
    )
  },

  /**
   * txlog.current
   */
  current: {
    ...createMultistepSelectors(sourcemapping.current),

    /**
     * txlog.current.state
     */
    state: createLeaf([evm.current.state], identity),

    /**
     * txlog.current.pointer
     * NOTE: transaction log pointer; NOT the AST pointer!
     */
    pointer: createLeaf(["/state"], state => state.proc.currentNodePointer),

    /**
     * txlog.current.pointerStack
     */
    pointerStack: createLeaf(["/state"], state => state.proc.pointerStack),

    /**
     * txlog.current.node
     * NOTE: transaction log node; NOT the AST node!
     */
    node: createLeaf(
      ["./pointer", "/proc/transactionLog"],
      (pointer, log) => log[pointer]
    ),

    /**
     * txlog.current.step
     */
    step: createLeaf(
      [trace.index, trace.steps],
      (index, steps) =>
        steps.length === 0
          ? -1 //special case: we use step -1 to mean before the steps start;
          : //so if there are no steps, that's what we want to report. trace.index
            //won't do that, though, so we special-case it in here.
            index //normal case
    ),

    /**
     * txlog.current.waitingForFunctionDefinition
     * This selector indicates whether there's a call (internal or external)
     * that is waiting to have its function definition identified when we hit
     * a function definition node.
     */
    waitingForFunctionDefinition: createLeaf(
      ["./node"],
      node =>
        (node.type === "callinternal" || node.type === "callexternal") &&
        node.waitingForFunctionDefinition
    ),

    /**
     * txlog.current.waitingForInternalCallToAbsorb
     */
    waitingForInternalCallToAbsorb: createLeaf(
      ["./node"],
      node => node.type === "callexternal" && node.absorbNextInternalCall
    ),

    /**
     * txlog.current.nextActionPointer
     * the pointer where a new action will be added
     */
    nextActionPointer: createLeaf(
      ["./pointer", "./node"],
      (pointer, node) => `${pointer}/actions/${node.actions.length}`
    ),

    /**
     * txlog.current.internalReturnPointer
     * the pointer where we'll end up after an internal return
     * (if we're on an internal call, it returns; if we're not,
     * we stay put and just absorb the info)
     */
    internalReturnPointer: createLeaf(
      ["./pointer", "./node"],
      (pointer, node) =>
        node.type === "callinternal"
          ? pointer.replace(/\/actions\/\d+$/, "")
          : pointer
    ),

    /**
     * txlog.current.externalReturnPointer
     * the pointer where we'll end up after an external return
     * (take the top stack entry, then go up one more)
     * (there should always be something on the stack when this
     * selector is used)
     */
    externalReturnPointer: createLeaf(["./pointerStack"], stack =>
      stack[stack.length - 1].replace(/\/actions\/\d+$/, "")
    ),

    /**
     * txlog.current.context
     * Note we use data context, not evm context
     * (i.e. decoder context, not debugger context)
     */
    context: createLeaf([data.current.context], identity),

    /**
     * txlog.current.call
     */
    call: createLeaf([evm.current.call], identity),

    /**
     * txlog.current.contract
     */
    contract: createLeaf([data.current.contract], identity),

    /**
     * txlog.current.isSourceRangeFinal
     */
    isSourceRangeFinal: createLeaf(
      [sourcemapping.current.isSourceRangeFinal],
      identity
    ),

    /**
     * txlog.current.onFunctionDefinition
     */
    onFunctionDefinition: createLeaf(
      [
        "./astNode",
        "./isSourceRangeFinal",
        "/next/inInternalSourceOrYul",
        trace.stepsRemaining
      ],
      (node, ready, isNextInternal, stepsRemaining) =>
        (ready || stepsRemaining <= 2) && //HACK: see below
        node &&
        node.nodeType === "FunctionDefinition" &&
        !isNextInternal //need to make sure we're not just jumping to a generated source or unmapped code
      //hack above: the last step doesn't get processed, so...
    ),

    /**
     * txlog.current.currentFunctionIsAsExpected
     *
     * Does the function we're currently in according to the AST,
     * match the function we're currently in according to the txlog?
     * (if we're in a modifier we'll ignore this check)
     */
    currentFunctionIsAsExpected: createLeaf(
      ["./node", data.current.function, data.current.contract],
      (txlogNode, currentFunction, contractNode) =>
        currentFunction &&
        (currentFunction.nodeType === "ContractDefinition" ||
          currentFunction.nodeType === "ModifierDefinition" ||
          (currentFunction.nodeType === "FunctionDefinition" &&
            currentFunction.name === txlogNode.functionName &&
            (txlogNode.kind === "callexternal" ||
              (contractNode && contractNode.name === txlogNode.contractName))))
    ),

    /**
     * txlog.current.compilationId
     */
    compilationId: createLeaf([data.current.compilationId], identity),

    /**
     * txlog.current.isJump
     */
    isJump: createLeaf([evm.current.step.isJump], identity),

    /**
     * txlog.current.jumpDirection
     */
    jumpDirection: createLeaf([sourcemapping.current.jumpDirection], identity),

    /**
     * txlog.current.isLog
     */
    isLog: createLeaf([evm.current.step.isLog], identity),

    /**
     * txlog.current.isStore
     */
    isStore: createLeaf([evm.current.step.isStore], identity),

    /**
     * txlog.current.rawStorageSlot
     * note we prepend 0x
     */
    rawStorageSlot: createLeaf(
      [evm.current.step.isStore, evm.current.step.storageAffected],
      (isStore, slot) => (isStore ? "0x" + slot : null)
    ),

    /**
     * txlog.current.rawStorageValue
     * note we prepend 0x
     */
    rawStorageValue: createLeaf([evm.current.step.valueStored], value =>
      value !== null ? "0x" + value : null
    ),

    /**
     * txlog.current.rawEventInfo
     */
    rawEventInfo: {
      /**
       * txlog.current.rawEventInfo.topics
       */
      topics: createLeaf([evm.current.step.logTopics], identity),

      /**
       * txlog.current.rawEventInfo.data
       */
      data: createLeaf([evm.current.step.logData], identity)
    },

    /**
     * txlog.current.isCall
     */
    isCall: createLeaf([evm.current.step.isCall], identity),

    /**
     * txlog.current.isDelegateCallBroad
     */
    isDelegateCallBroad: createLeaf(
      [evm.current.step.isDelegateCallBroad],
      identity
    ),

    /**
     * txlog.current.isCreate
     */
    isCreate: createLeaf([evm.current.step.isCreate], identity),

    /**
     * txlog.current.isInstantCallOrCreate
     */
    isInstantCallOrCreate: createLeaf(
      [evm.current.step.isInstantCallOrCreate],
      identity
    ),

    /**
     * txlog.current.isHalting
     */
    isHalting: createLeaf([evm.current.step.isHalting], identity),

    /**
     * txlog.current.returnStatus
     */
    returnStatus: createLeaf([evm.current.step.returnStatus], identity),

    /**
     * txlog.current.callValue
     */
    callValue: createLeaf([evm.current.step.callValue], identity),

    /**
     * txlog.current.callAddress
     */
    callAddress: createLeaf([evm.current.step.callAddress], identity),

    /**
     * txlog.current.callContext
     * note we make sure to use data, not evm, context!
     * (i.e. decoder context, not debugger context)
     */
    callContext: createLeaf([data.current.callContext], identity),

    /**
     * txlog.current.absorbNextInternalCall
     */
    absorbNextInternalCall: createLeaf(
      [sourcemapping.current.callRequiresPhantomFrame],
      identity
    ),

    /**
     * txlog.current.callData
     */
    callData: createLeaf([evm.current.step.callData], identity),

    /**
     * txlog.current.createBinary
     */
    createBinary: createLeaf([evm.current.step.createBinary], identity),

    /**
     * txlog.current.createValue
     */
    createValue: createLeaf([evm.current.step.createValue], identity),

    /**
     * txlog.current.createdAddress
     */
    createdAddress: createLeaf([evm.current.step.createdAddress], identity),

    /**
     * txlog.current.salt
     */
    salt: createLeaf([evm.current.step.salt], identity),

    /**
     * txlog.current.isSelfDestruct
     */
    isSelfDestruct: createLeaf([evm.current.step.isSelfDestruct], identity),

    /**
     * txlog.current.beneficiary
     */
    beneficiary: createLeaf([evm.current.step.beneficiary], identity),

    /**
     * txlog.current.returnData
     */
    returnData: createLeaf([evm.current.step.returnValue], identity),

    /**
     * txlog.current.inputParameterAllocations
     */
    inputParameterAllocations: createLeaf(
      ["./astNode", "./state"],
      (functionDefinition, { stack }) => {
        if (
          !functionDefinition ||
          functionDefinition.nodeType !== "FunctionDefinition"
        ) {
          return null;
        }
        return locateParameters(
          functionDefinition.parameters.parameters,
          stack.length - 1
        );
      }
    ),

    /**
     * txlog.current.outputParameterAllocations
     */
    outputParameterAllocations: createLeaf(
      ["./astNode", "./state"],
      (functionDefinition, { stack }) => {
        if (
          !functionDefinition ||
          functionDefinition.nodeType !== "FunctionDefinition"
        ) {
          return null;
        }
        //when this selector is invoked, we're on the jump out step, so the
        //top element of the stack is the return address; we need to skip past that
        return locateParameters(
          functionDefinition.returnParameters.parameters,
          stack.length - 2
        );
      }
    )
  },

  /**
   * txlog.next
   */
  next: {
    ...createMultistepSelectors(sourcemapping.next)
  },

  /**
   * txlog.views
   */
  views: {
    /**
     * txlog.views.transactionLog
     * contains the actual transformed transaction log ready for use!
     */
    transactionLog: createLeaf(["/proc/transactionLog"], log => {
      const tie = node =>
        node.actions
          ? {
              ...node,
              actions: node.actions.map(pointer => tie(log[pointer]))
            }
          : node;
      return tie(log[""]); //"" is always the root node
    }),

    /**
     * txlog.views.flattedEvents
     */
    flattedEvents: createLeaf(["./transactionLog"], log => {
      const returnStatus = node => {
        switch (node.returnKind) {
          case "revert":
            return false;
          case "unwind":
            //note: if the returnKind is "unwind", the last action *must*
            //be a callinternal!  if not, something has gone very wrong.
            const lastCall = node.actions[node.actions.length - 1];
            return returnStatus(lastCall);
          default:
            return true;
        }
      };
      const getFlattedEvents = (node, address, codeAddress, status) => {
        switch (node.type) {
          case "transaction":
            return node.actions.flatMap(subNode =>
              getFlattedEvents(subNode, node.origin, node.origin, status)
            );
          case "callexternal":
            const subNodeStatus = returnStatus(node);
            return node.actions.flatMap(subNode =>
              getFlattedEvents(
                subNode,
                node.isDelegate ? address : node.address,
                node.address,
                status && subNodeStatus
              )
            );
          case "callinternal":
            return node.actions.flatMap(subNode =>
              getFlattedEvents(subNode, address, codeAddress, status)
            );
          case "event":
            return [
              {
                decoding: node.decoding,
                raw: node.raw,
                step: node.step,
                address,
                codeAddress,
                status
              }
            ];
          default:
            return [];
        }
      };
      return getFlattedEvents(log, null, null, true);
    })
  }
});

function locateParameters(parameters, top) {
  const reverseParameters = parameters.slice().reverse();
  //note we clone before reversing because reverse() is in place

  let results = [];
  let currentPosition = top;
  for (let parameter of reverseParameters) {
    const words = Codec.Ast.Utils.stackSize(parameter);
    const pointer = {
      location: "stack",
      from: currentPosition - words + 1,
      to: currentPosition
    };

    results.unshift({
      name: parameter.name ? parameter.name : undefined, //replace "" with undefined
      definition: parameter,
      pointer
    });
    currentPosition -= words;
  }
  return results;
}

export default txlog;
