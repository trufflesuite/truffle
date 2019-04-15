import * as utils from "truffle-decode-utils";

const stringify = require("json-stable-stringify");

/** AST node types that are skipped by stepNext() to filter out some noise */
export function isDeliberatelySkippedNodeType(node) {
  const skippedTypes = ["ContractDefinition", "VariableDeclaration"];
  return skippedTypes.includes(node.nodeType);
}

//HACK
//these aren't the only types of skipped nodes, but determining all skipped
//nodes would be too difficult
export function isSkippedNodeType(node) {
  const otherSkippedTypes = ["VariableDeclarationStatement", "Mapping"];
  return (
    isDeliberatelySkippedNodeType(node) ||
    otherSkippedTypes.includes(node.nodeType) ||
    node.nodeType.includes("TypeName") || //HACK
    //skip string literals too -- we'll handle that manually
    (node.typeDescriptions !== undefined && //seems this sometimes happens?
      utils.Definition.typeClass(node) === "stringliteral")
  );
}

export function prefixName(prefix, fn) {
  Object.defineProperty(fn, "name", {
    value: `${prefix}.${fn.name}`,
    configurable: true
  });

  return fn;
}

/*
 * extract the primary source from a source map
 * (i.e., the source for the first instruction, found
 * between the second and third colons)
 * (this is something of a HACK)
 */
export function extractPrimarySource(sourceMap) {
  return parseInt(sourceMap.match(/^[^:]+:[^:]+:([^:]+):/)[1]);
}

/**
 * @return 0x-prefix string of keccak256 hash
 */
export function keccak256(...args) {
  return utils.Conversion.toHexString(utils.EVM.keccak256(...args));
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
 * Given a mmemonic, determine whether it's the mnemonic of a normal
 * halting instruction
 */
export function isNormalHaltingMnemonic(op) {
  const halts = ["STOP", "RETURN", "SELFDESTRUCT", "SUICIDE"];
  //the mnemonic SUICIDE is no longer used, but just in case, I'm including it
  return halts.includes(op);
}
