import debugModule from "debug";
const debug = debugModule("codec:contexts:utils");

import * as Evm from "@truffle/codec/evm";
import type * as Compilations from "@truffle/codec/compilations";
import type * as Ast from "@truffle/codec/ast";
import * as Conversion from "@truffle/codec/conversion";
import type { CompilerVersion } from "@truffle/codec/compiler";
import type { Context, Contexts } from "./types";
import escapeRegExp from "lodash/escapeRegExp";
import * as cbor from "cbor";
import { Shims } from "@truffle/compile-common";
import * as Abi from "@truffle/abi-utils";
import type * as Common from "@truffle/codec/common";
import * as AbiDataUtils from "@truffle/codec/abi-data/utils";

export function findContext(
  contexts: Contexts,
  binary: string
): Context | null {
  const matchingContexts = Object.values(contexts).filter(context =>
    matchContext(context, binary)
  );
  //rather than just pick an arbitrary matching context, we're going
  //to pick one that isn't a descendant of any of the others.
  //(if there are multiple of *those*, then yeah it's arbitrary.)
  const context = matchingContexts.find(
    descendant =>
      !matchingContexts.some(
        ancestor =>
          descendant.compilationId === ancestor.compilationId &&
          descendant.linearizedBaseContracts &&
          ancestor.contractId !== undefined &&
          descendant.linearizedBaseContracts
            .slice(1)
            .includes(ancestor.contractId)
        //we do slice one because everything is an an ancestor of itself; we only
        //care about *proper* ancestors
      )
  );
  return context || null;
}

export function matchContext(context: Context, givenBinary: string): boolean {
  const { binary, compiler, isConstructor } = context;
  const lengthDifference = givenBinary.length - binary.length;
  //first: if it's not a constructor, and it's not Vyper,
  //they'd better be equal in length.
  //if it is a constructor, or is Vyper,
  //the given binary must be at least as long,
  //and the difference must be a multiple of 32 bytes (64 hex digits)
  const additionalAllowed =
    isConstructor || (compiler != undefined && compiler.name === "vyper");
  if (
    (!additionalAllowed && lengthDifference !== 0) ||
    lengthDifference < 0 ||
    lengthDifference % (2 * Evm.Utils.WORD_SIZE) !== 0
  ) {
    return false;
  }
  for (let i = 0; i < binary.length; i++) {
    //note: using strings like arrays is kind of dangerous in general in JS,
    //but everything here is ASCII so it's fine
    //note that we need to compare case-insensitive, since Solidity will
    //put addresses in checksum case in the compiled source
    //(we don't actually need that second toLowerCase(), but whatever)
    if (
      binary[i] !== "." &&
      binary[i].toLowerCase() !== givenBinary[i].toLowerCase()
    ) {
      return false;
    }
  }
  return true;
}

export function normalizeContexts(contexts: Contexts): Contexts {
  //unfortunately, due to our current link references format, we can't
  //really use the binary from the artifact directly -- neither for purposes
  //of matching, nor for purposes of decoding internal functions.  So, we
  //need to perform this normalization step on our contexts before using
  //them.  Once we have truffle-db, this step should largely go away.

  debug("normalizing contexts");

  //first, let's clone the input
  //(let's do a 2-deep clone because we'll be altering binary & compiler)
  let newContexts: Contexts = Object.assign(
    {},
    ...Object.entries(contexts).map(([contextHash, context]) => ({
      [contextHash]: { ...context }
    }))
  );

  debug("contexts cloned");

  //next, we get all the library names and sort them descending by length.
  //We're going to want to go in descending order of length so that we
  //don't run into problems when one name is a substring of another.
  //For simplicity, we'll exclude names of length <38, because we can
  //handle these with our more general check for link references at the end
  const fillerLength = 2 * Evm.Utils.ADDRESS_SIZE;
  let names = Object.values(newContexts)
    .filter(context => context.contractKind === "library")
    .map(context => context.contractName)
    .filter(name => name.length >= fillerLength - 3)
    //the -3 is for 2 leading underscores and 1 trailing
    .sort((name1, name2) => name2.length - name1.length);

  debug("names sorted");

  //now, we need to turn all these names into regular expressions, because,
  //unfortunately, str.replace() will only replace all if you use a /g regexp;
  //note that because names may contain '$', we need to escape them
  //(also we prepend "__" because that's the placeholder format)
  let regexps = names.map(name => new RegExp(escapeRegExp("__" + name), "g"));

  debug("regexps prepared");

  //having done so, we can do the replace for these names!
  const replacement = ".".repeat(fillerLength);
  for (let regexp of regexps) {
    for (let context of Object.values(newContexts)) {
      context.binary = context.binary.replace(regexp, replacement);
    }
  }

  debug("long replacements complete");

  //now we can do a generic replace that will catch all names of length
  //<40, while also catching the Solidity compiler's link reference format
  //as well as Truffle's.  Hooray!
  const genericRegexp = new RegExp("_.{" + (fillerLength - 2) + "}_", "g");
  //we're constructing the regexp /_.{38}_/g, but I didn't want to use a
  //literal 38 :P
  for (let context of Object.values(newContexts)) {
    context.binary = context.binary.replace(genericRegexp, replacement);
  }

  debug("short replacements complete");
  //now we must handle the delegatecall guard -- libraries' deployedBytecode will include
  //0s in place of their own address instead of a link reference at the
  //beginning, so we need to account for that too
  const pushAddressInstruction = (0x60 + Evm.Utils.ADDRESS_SIZE - 1).toString(
    16
  ); //"73"
  for (let context of Object.values(newContexts)) {
    if (context.contractKind === "library" && !context.isConstructor) {
      context.binary = context.binary.replace(
        "0x" + pushAddressInstruction + "00".repeat(Evm.Utils.ADDRESS_SIZE),
        "0x" + pushAddressInstruction + replacement
      );
    }
  }

  debug("extra library replacements complete");

  //now let's handle immutable references
  //(these are much nicer than link references due to not having to deal with the old format)
  for (let context of Object.values(newContexts)) {
    if (context.immutableReferences) {
      for (let variable of Object.values(context.immutableReferences)) {
        for (let { start, length } of <{ start: number; length: number }[]>(
          variable
        )) {
          //Goddammit TS
          let lowerStringIndex = 2 + 2 * start;
          let upperStringIndex = 2 + 2 * (start + length);
          context.binary =
            context.binary.slice(0, lowerStringIndex) +
            "..".repeat(length) +
            context.binary.slice(upperStringIndex);
        }
      }
    }
  }

  debug("immutables complete");

  //now: extract & decode all the cbor's.  we're going to use these for
  //two different purposes, so let's just get them all upfront.
  let cborInfos: { [contextHash: string]: CborInfo } = {};
  let decodedCbors: { [contextHash: string]: any } = {};
  //note: invalid cbor will be indicated in decodedCbors by the lack of an entry,
  //*not* by undefined or null, since there exists cbor for those :P

  for (const [contextHash, context] of Object.entries(newContexts)) {
    const cborInfo = extractCborInfo(context.binary);
    cborInfos[contextHash] = cborInfo;
    if (cborInfo) {
      try {
        //note this *will* throw if there's data left over,
        //which is what we want it to do
        const decoded: any = cbor.decodeFirstSync(cborInfo.cbor);
        decodedCbors[contextHash] = decoded;
      } catch {
        //just don't add it
      }
    }
  }

  debug("intial cbor processing complete");

  //now: if a context lacks a compiler, but a version can be found in the
  //cbor, add it.
  for (let [contextHash, context] of Object.entries(newContexts)) {
    if (!context.compiler && contextHash in decodedCbors) {
      context.compiler = detectCompilerInfo(decodedCbors[contextHash]);
    }
  }

  debug("versions complete");

  //one last step: where there's CBOR with a metadata hash, we'll allow the
  //CBOR to vary, aside from the length (note: ideally here we would *only*
  //dot-out the metadata hash part of the CBOR, but, well, it's not worth the
  //trouble to detect that; doing that could potentially get pretty involved)
  //note that if the code isn't Solidity, that's fine -- we just won't get
  //valid CBOR and will not end up adding to our list of regular expressions
  const externalCborInfos = Object.entries(cborInfos)
    .filter(
      ([contextHash, _cborInfo]) =>
        contextHash in decodedCbors &&
        isObjectWithHash(decodedCbors[contextHash])
    )
    .map(([_contextHash, cborInfo]) => cborInfo);
  const cborRegexps = externalCborInfos.map(cborInfo => ({
    input: new RegExp(cborInfo.cborSegment, "g"), //hex string so no need for escape
    output: "..".repeat(cborInfo.cborLength) + cborInfo.cborLengthHex
  }));
  //HACK: we will replace *every* occurrence of *every* external CBOR occurring
  //in *every* context, in order to cover created contracts (including if there
  //are multiple or recursive ones)
  for (let context of Object.values(newContexts)) {
    for (let { input, output } of cborRegexps) {
      context.binary = context.binary.replace(input, output);
    }
  }

  debug("external wildcards complete");

  //finally, return this mess!
  return newContexts;
}

interface CborInfo {
  cborStart: number;
  cborLength: number;
  cborEnd: number;
  cborLengthHex: string;
  cbor: string;
  cborSegment: string;
}

//note: we *don't* bother handling Vyper 0.3.4's idiosyncratic CBOR
//here, because it's always fixed, so there just isn't any need to;
//we're OK with just not normalizing that
function extractCborInfo(binary: string): CborInfo | null {
  debug("extracting cbor segement of %s", binary);
  const lastTwoBytes = binary.slice(2).slice(-2 * 2); //2 bytes * 2 for hex
  //the slice(2) there may seem unnecessary; it's to handle the possibility that the contract
  //has less than two bytes in its bytecode (that won't happen with Solidity, but let's be
  //certain)
  if (lastTwoBytes.length < 2 * 2) {
    return null; //don't try to handle this case!
  }
  const cborLength: number = parseInt(lastTwoBytes, 16);
  const cborEnd = binary.length - 2 * 2;
  const cborStart = cborEnd - cborLength * 2;
  //sanity check
  if (cborStart < 2) {
    //"0x"
    return null; //don't try to handle this case!
  }
  const cbor = binary.slice(cborStart, cborEnd);
  return {
    cborStart,
    cborLength,
    cborEnd,
    cborLengthHex: lastTwoBytes,
    cbor,
    cborSegment: cbor + lastTwoBytes
  };
}

function isObjectWithHash(decoded: any): boolean {
  if (typeof decoded !== "object" || decoded === null) {
    return false;
  }
  //cbor sometimes returns maps and sometimes objects,
  //so let's make things consistent by converting to a map
  //(actually, is this true? borc did this, I think cbor
  //does too, but I haven't checked recently)
  if (!(decoded instanceof Map)) {
    decoded = new Map(Object.entries(decoded));
  }
  const hashKeys = ["bzzr0", "bzzr1", "ipfs"];
  return hashKeys.some(key => decoded.has(key));
}

//returns undefined if no valid compiler info detected
//(if it detects solc but no version, it will not return
//a partial result, just undefined)
function detectCompilerInfo(decoded: any): CompilerVersion | undefined {
  if (typeof decoded !== "object" || decoded === null) {
    return undefined;
  }
  //cbor sometimes returns maps and sometimes objects,
  //so let's make things consistent by converting to a map
  //(although see note above?)
  if (!(decoded instanceof Map)) {
    decoded = new Map(Object.entries(decoded));
  }
  if (!decoded.has("solc")) {
    //return undefined if the solc version field is not present
    //(this occurs if version <0.5.9)
    //currently no other language attaches cbor info, so, yeah
    return undefined;
  }
  const rawVersion = decoded.get("solc");
  if (typeof rawVersion === "string") {
    //for prerelease versions, the version is stored as a string.
    return {
      name: "solc",
      version: rawVersion
    };
  } else if (rawVersion instanceof Uint8Array && rawVersion.length === 3) {
    //for release versions, it's stored as a bytestring of length 3, with the
    //bytes being major, minor, patch. so we just join them with "." to form
    //a version string (although it's missing precise commit & etc).
    return {
      name: "solc",
      version: rawVersion.join(".")
    };
  } else {
    //return undefined on anything else
    return undefined;
  }
}

export function makeContext(
  contract: Compilations.Contract,
  node: Ast.AstNode | undefined,
  compilation: Compilations.Compilation,
  isConstructor = false
): Context {
  const abi = Abi.normalize(contract.abi);
  const bytecode = isConstructor
    ? contract.bytecode
    : contract.deployedBytecode;
  const binary: string = Shims.NewToLegacy.forBytecode(bytecode);
  const hash = Conversion.toHexString(
    Evm.Utils.keccak256({
      type: "string",
      value: binary
    })
  );
  debug("hash: %s", hash);
  const fallback =
    <Abi.FallbackEntry>abi.find(abiEntry => abiEntry.type === "fallback") ||
    null; //TS is failing at inference here
  const receive =
    <Abi.ReceiveEntry>abi.find(abiEntry => abiEntry.type === "receive") || null; //and here
  return {
    context: hash,
    contractName: contract.contractName,
    binary,
    contractId: node ? node.id : undefined,
    linearizedBaseContracts: node ? node.linearizedBaseContracts : undefined,
    contractKind: contractKind(contract, node),
    immutableReferences: isConstructor
      ? undefined
      : contract.immutableReferences,
    isConstructor,
    abi: AbiDataUtils.computeSelectors(abi),
    payable: AbiDataUtils.abiHasPayableFallback(abi),
    fallbackAbi: { fallback, receive },
    compiler: compilation.compiler || contract.compiler,
    compilationId: compilation.id
  };
}

//attempts to determine if the given contract is a library or not
function contractKind(
  contract: Compilations.Contract,
  node?: Ast.AstNode
): Common.ContractKind {
  //first: if we have a node, use its listed contract kind
  if (node) {
    return node.contractKind;
  }
  //next: check the contract kind field on the contract object itself, if it exists.
  //however this isn't implemented yet so we'll skip it.
  //next: if we have no direct info on the contract kind, but we do
  //have the deployed bytecode, we'll use a HACK:
  //we'll assume it's an ordinary contract, UNLESS its deployed bytecode begins with
  //PUSH20 followed by 20 0s, in which case we'll assume it's a library
  //(note: this will fail to detect libraries from before Solidity 0.4.20)
  if (contract.deployedBytecode) {
    const deployedBytecode = Shims.NewToLegacy.forBytecode(
      contract.deployedBytecode
    );
    const pushAddressInstruction = (0x60 + Evm.Utils.ADDRESS_SIZE - 1).toString(
      16
    ); //"73"
    const libraryString =
      "0x" + pushAddressInstruction + "00".repeat(Evm.Utils.ADDRESS_SIZE);
    return deployedBytecode.startsWith(libraryString) ? "library" : "contract";
  }
  //finally, in the absence of anything to go on, we'll assume it's an ordinary contract
  return "contract";
}
