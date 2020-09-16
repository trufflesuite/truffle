import * as Codec from "@truffle/codec";
import stringify from "json-stable-stringify";

/** AST node types that are skipped by stepNext() to filter out some noise */
export function isDeliberatelySkippedNodeType(node) {
  const skippedTypes = [
    "ContractDefinition",
    "VariableDeclaration",
    "YulVariableDeclaration",
    "YulBlock"
  ];
  return skippedTypes.includes(node.nodeType);
}

//HACK
//these aren't the only types of skipped nodes, but determining all skipped
//nodes would be too difficult
export function isSkippedNodeType(node) {
  const otherSkippedTypes = [
    "VariableDeclarationStatement",
    "Mapping",
    "Block",
    "InlineAssembly", //definitely do *not* add to deliberately skipped!
    "YulTypedName"
  ];
  return (
    isDeliberatelySkippedNodeType(node) ||
    otherSkippedTypes.includes(node.nodeType) ||
    node.nodeType.includes("TypeName") || //HACK
    //skip string literals too -- we'll handle that manually
    (node.typeDescriptions !== undefined && //seems this sometimes happens?
      Codec.Ast.Utils.typeClass(node) === "stringliteral")
  );
}

export function prefixName(prefix, fn) {
  Object.defineProperty(fn, "name", {
    value: `${prefix}.${fn.name}`,
    configurable: true
  });

  return fn;
}

export function makePath(sourceId, pointer) {
  return `${sourceId}:${pointer}`;
}

/**
 * returns a new array which is a copy of array but with
 * elements popped from the top until numToRemove elements
 * satisfying the predicate have been removed (or until the
 * array is empty)
 */
export function popNWhere(array, numToRemove, predicate) {
  let newArray = array.slice();
  //I'm going to write this the C way, hope you don't mind :P
  while (numToRemove > 0 && newArray.length > 0) {
    let top = newArray[newArray.length - 1];
    if (predicate(top)) {
      numToRemove--;
    }
    newArray.pop();
  }
  return newArray;
}

/**
 * @return 0x-prefix string of keccak256 hash
 */
export function keccak256(...args) {
  return Codec.Conversion.toHexString(
    Codec.Evm.Utils.keccak256(...args),
    Codec.Evm.Utils.WORD_SIZE
  );
}

/**
 * Given an object, return a stable hash by first running it through a stable
 * stringify operation before hashing
 */
export function stableKeccak256(obj) {
  return keccak256({ type: "string", value: stringify(obj) });
}

/*
 * used by data; takes an id object and a ref (pointer) and returns a full
 * corresponding assignment object
 */
export function makeAssignment(idObj, ref) {
  let id = stableKeccak256(idObj);
  return { ...idObj, id, ref };
}

/*
 * Given a mmemonic, determine whether it's the mnemonic of a calling
 * instruction (does NOT include creation instructions)
 */
export function isCallMnemonic(op) {
  const calls = ["CALL", "DELEGATECALL", "STATICCALL", "CALLCODE"];
  return calls.includes(op);
}

/*
 * returns true for mnemonics for calls that take only 6 args instead of 7
 */
export function isShortCallMnemonic(op) {
  const shortCalls = ["DELEGATECALL", "STATICCALL"];
  return shortCalls.includes(op);
}

/*
 * returns true for mnemonics for calls that delegate storage
 */
export function isDelegateCallMnemonicBroad(op) {
  const delegateCalls = ["DELEGATECALL", "CALLCODE"];
  return delegateCalls.includes(op);
}

/*
 * returns true for mnemonics for calls that delegate everything
 */
export function isDelegateCallMnemonicStrict(op) {
  const delegateCalls = ["DELEGATECALL"];
  return delegateCalls.includes(op);
}

/*
 * returns true for mnemonics for static calls
 */
export function isStaticCallMnemonic(op) {
  const delegateCalls = ["STATICCALL"];
  return delegateCalls.includes(op);
}

/*
 * Given a mmemonic, determine whether it's the mnemonic of a creation
 * instruction
 */
export function isCreateMnemonic(op) {
  const creates = ["CREATE", "CREATE2"];
  return creates.includes(op);
}

/*
 * Given a mmemonic, determine whether it's the mnemonic of a self-destruct
 * instruction
 */
export function isSelfDestructMnemonic(op) {
  const creates = ["SELFDESTRUCT", "SUICIDE"]; //latter name shouldn't be used anymore but let's be safe
  return creates.includes(op);
}
