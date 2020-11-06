import debugModule from "debug";
const debug = debugModule("debugger:txlog:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";

import data from "lib/data/selectors";
import evm from "lib/evm/selectors";
import solidity from "lib/solidity/selectors";

import * as Codec from "@truffle/codec";

const identity = x => x;

function createMultistepSelectors(stepSelector) {
  return {
    /**
     * .source
     * HACK: see notes in solidity selectors about cases
     * where this won't work
     */
    source: createLeaf([stepSelector.source], identity),

    /**
     * .node
     * HACK: see notes in solidity selectors about cases
     * where this won't work
     */
    node: createLeaf([stepSelector.node], identity),

    /**
     * .inInternalSourceOrYul
     */
    inInternalSourceOrYul: createLeaf(
      ["./source", "./node"],
      //note: the first of these won't actually happen atm, as source id
      //of -1 would instead result in source.id === undefined, but I figure
      //I'll include that condition in case I end up changing this later
      (source, node) =>
        !node || source.internal || node.nodeType.startsWith("Yul")
    )
  };
}

let txlog = createSelectorTree({
  /**
   * txlog.state
   */
  state: state => state.txlog,

  /**
   * txlog.transaction
   */
  transaction: {
    /**
     * txlog.transaction.origin
     */
    origin: createLeaf([evm.transaction.globals.tx], tx => tx.origin)
  },

  /**
   * txlog.current
   */
  current: {
    ...createMultistepSelectors(solidity.current),

    /**
     * txlog.current.state
     */
    state: createLeaf([evm.current.state], identity),

    /**
     * txlog.current.transactionLog
     */
    transactionLog: createLeaf(["/state"], state => state.proc.transactionLog),

    /**
     * txlog.current.transactionTree
     */
    transactionTree: createLeaf(["./transactionLog"], logToTree),

    /**
     * txlog.current.lastAction
     */
    lastAction: createLeaf(["./transactionLog"], log => log[log.length - 1]),

    /**
     * txlog.current.waitingForFunctionDefinition
     * This selector indicates whether there's a call (internal or external)
     * that is waiting to have its function definition identified when we hit
     * a function definition node.
     */
    waitingForFunctionDefinition: createLeaf(
      ["./lastAction"],
      lastAction =>
        (lastAction.type === "callinternal" ||
          lastAction.type === "callexternal") &&
        lastAction.waitingForFunctionDefinition
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
      [solidity.current.isSourceRangeFinal],
      identity
    ),

    /**
     * txlog.current.onFunctionDefinition
     */
    onFunctionDefinition: createLeaf(
      ["./node", "./isSourceRangeFinal"],
      (node, ready) => ready && node && node.nodeType === "FunctionDefinition"
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
    jumpDirection: createLeaf([solidity.current.jumpDirection], identity),

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
     * txlog.current.inputParameterAllocations
     */
    inputParameterAllocations: createLeaf(
      ["./node", "./state"],
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
      ["./node", "./state"],
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
    ...createMultistepSelectors(solidity.next)
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

//this function turns the log array into a tree object.
function logToTree(log) {
  let tree = { type: "origin", actions: [] };
  let currentNode = tree; //this variable will act as a pointer; we will make writes through it
  let nodeStack = [tree]; //the entries here should similarly be thought of as pointers
  for (let action of log) {
    debug(
      "stack info: %o",
      nodeStack.map(node => ({ type: node.type, name: node.functionName }))
    );
    debug("currentNode: %o", {
      type: currentNode.type,
      name: currentNode.functionName
    });
    if (currentNode !== nodeStack[nodeStack.length - 1]) {
      debug("node stack desynchronized!!");
    }
    switch (action.type) {
      case "origin":
        debug("setting origin");
        debug("address: %s", action.address);
        if (currentNode.type === "origin") {
          currentNode.address = action.address;
        } else {
          debug("attempt to set origin of bad node type!");
        }
        break;
      case "callexternal": {
        debug("external call");
        if (
          currentNode.type === "callexternal" &&
          currentNode.kind === "library"
        ) {
          //didn't identify it as function, so set it to message
          currentNode.kind = "message";
        }
        const {
          type,
          address,
          context,
          value,
          kind,
          isDelegate,
          functionName,
          contractName,
          variables,
          instant,
          calldata,
          binary,
          waitingForFunctionDefinition
        } = action;
        let call = {
          type,
          address,
          contextHash: context.context || null,
          value,
          kind,
          isDelegate,
          functionName,
          contractName,
          arguments: variables,
          actions: []
        };
        if (kind === "message" || kind === "library") {
          call.data = calldata;
        } else if (kind === "unknowncreate") {
          call.binary = binary;
        }
        if (instant) {
          call.returnKind = action.status ? "return" : "revert";
          currentNode.actions.push(call);
        } else {
          call.waitingForFunctionDefinition = waitingForFunctionDefinition;
          currentNode.actions.push(call);
          currentNode = call;
          nodeStack.push(call);
        }
        break;
      }
      case "callinternal": {
        debug("internal call");
        const {
          type,
          functionName,
          contractName,
          variables,
          waitingForFunctionDefinition
        } = action;
        if (
          currentNode.type === "callexternal" &&
          currentNode.kind !== "constructor" &&
          currentNode.waitingForFunctionDefinition
        ) {
          //this is for handling post-0.5.1 initial jump-ins; don't add
          //a separate internal call if we're sitting on an external call
          //waiting to be identified
          //However, note that we don't do this for constructors, because
          //for constructors, an initializer could run first.  Fortunately
          //constructors don't have a jump in, so it works out OK!
          break;
        }
        const call = {
          type,
          functionName,
          contractName,
          arguments: variables,
          actions: [],
          waitingForFunctionDefinition
        };
        currentNode.actions.push(call);
        currentNode = call;
        nodeStack.push(call);
        break;
      }
      case "returninternal":
        debug("internal return");
        //pop the top call from the stack if it's internal (and set its return values)
        //if the top call is instead external, just set its return values if appropriate.
        //(this is how we handle internal/external return absorption)
        if (currentNode.type === "callinternal") {
          currentNode.returnKind = "return";
          currentNode.returnValues = action.variables;
          delete currentNode.waitingForFunctionDefinition;
          nodeStack.pop();
          currentNode = nodeStack[nodeStack.length - 1];
        } else if (currentNode.type === "callexternal") {
          if (currentNode.kind === "function") {
            //don't set return variables for non-function external calls
            currentNode.returnValues = action.variables;
          }
        } else {
          debug("returninternal once tx done!");
        }
        break;
      case "identify": {
        currentNode.waitingForFunctionDefinition = false;
        const { variables, functionName, contractName } = action;
        if (!currentNode.functionName) {
          currentNode.functionName = functionName;
        }
        if (!currentNode.contractName) {
          currentNode.contractName = contractName;
        }
        if (!currentNode.arguments) {
          currentNode.arguments = variables;
        }
        if (
          currentNode.type === "callexternal" &&
          currentNode.kind === "library"
        ) {
          currentNode.kind = "function";
          delete currentNode.data;
        }
        break;
      }
      case "returnexternal":
      case "revert":
      case "selfdestruct":
        if (
          currentNode.type === "callexternal" &&
          currentNode.kind === "library"
        ) {
          //didn't identify it as function, so set it to message
          currentNode.kind = "message";
        }
        switch (action.type) {
          case "returnexternal":
            debug("external return");
            if (!currentNode.returnKind) {
              currentNode.returnKind = "return";
            }
            break;
          case "revert":
            debug("revert");
            currentNode.returnKind = "revert";
            currentNode.message = action.message;
            break;
          case "selfdestruct":
            debug("selfdestruct");
            currentNode.returnKind = "selfdestruct";
            currentNode.beneficiary = action.beneficiary;
            break;
        }
        //pop all calls from stack until we pop an external call.
        //we don't handle return values here since those are handled
        //in returninternal (yay absorption)
        debug("currentNode: %o", currentNode);
        while (currentNode.type !== "callexternal") {
          if (nodeStack.length === 0 || currentNode.type !== "callinternal") {
            debug("problem handling external return");
          }
          if (!currentNode.returnKind) {
            //set the return kind on any nodes popped along the way that don't have
            //one already to note that they failed to return due to a call they made
            //reverting
            currentNode.returnKind = "unwind";
          }
          delete currentNode.waitingForFunctionDefinition;
          debug("preliminary popping");
          nodeStack.pop();
          currentNode = nodeStack[nodeStack.length - 1];
        }
        //now handle the external call.  first let's set the returnKind if there
        //isn't one already (in which case we can infer it was unwound).
        if (!currentNode.returnKind) {
          currentNode.returnKind = "unwind";
        }
        //now let's set its return variables if applicable.
        if (
          currentNode.kind === "function" &&
          action.type === "returnexternal" &&
          action.decodings
        ) {
          const decoding = action.decodings.find(
            decoding => decoding.kind === "return"
          );
          if (decoding) {
            //we'll trust this method over the method resulting from an internal return,
            //*if* it produces a valid return-value decoding.  if it doesn't, we ignore it.
            currentNode.returnValues = decoding.arguments;
          }
        }
        //also, set immutables if applicable -- note that we do *not* attempt to set
        //these the internal way, as we don't have a reliable way of doing that
        if (
          currentNode.kind === "constructor" &&
          action.type === "returnexternal" &&
          action.decodings
        ) {
          const decoding = action.decodings.find(
            decoding => decoding.kind === "bytecode"
          );
          if (decoding && decoding.immutables) {
            currentNode.returnImmutables = decoding.immutables;
          }
        }
        //finally, pop it from the stack.
        delete currentNode.waitingForFunctionDefinition;
        nodeStack.pop();
        currentNode = nodeStack[nodeStack.length - 1];
        break;
      default:
        //nothing goes here at the moment, but this will possibly
        //handle other generic actions in the future
        debug("generic action");
        currentNode.actions.push(action);
    }
  }
  return tree;
}

export default txlog;
