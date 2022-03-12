import debugModule from "debug";
const debug = debugModule("codec:core");

import type * as Abi from "@truffle/abi-utils";
import * as Ast from "@truffle/codec/ast";
import * as AbiData from "@truffle/codec/abi-data";
import * as Topic from "@truffle/codec/topic";
import type * as Pointer from "@truffle/codec/pointer";
import type {
  DecoderRequest,
  StateVariable,
  CalldataDecoding,
  ReturndataDecoding,
  BytecodeDecoding,
  UnknownBytecodeDecoding,
  DecodingMode,
  AbiArgument,
  LogDecoding,
  LogOptions
} from "@truffle/codec/types";
import * as Evm from "@truffle/codec/evm";
import * as Contexts from "@truffle/codec/contexts";
import { abifyType, abifyResult } from "@truffle/codec/abify";
import * as Conversion from "@truffle/codec/conversion";
import type * as Format from "@truffle/codec/format";
import { StopDecodingError } from "@truffle/codec/errors";
import read from "@truffle/codec/read";
import decode from "@truffle/codec/decode";
import Web3Utils from "web3-utils";

/**
 * @Category Decoding
 */
export function* decodeVariable(
  definition: Ast.AstNode,
  pointer: Pointer.DataPointer,
  info: Evm.EvmInfo,
  compilationId: string
): Generator<DecoderRequest, Format.Values.Result, Uint8Array> {
  let compiler = info.currentContext.compiler;
  let dataType = Ast.Import.definitionToType(
    definition,
    compilationId,
    compiler
  );
  return yield* decode(dataType, pointer, info); //no need to pass an offset
}

/**
 * @Category Decoding
 */
export function* decodeCalldata(
  info: Evm.EvmInfo,
  isConstructor?: boolean //ignored if context! trust context instead if have
): Generator<DecoderRequest, CalldataDecoding, Uint8Array> {
  const context = info.currentContext;
  if (context === null) {
    //if we don't know the contract ID, we can't decode
    if (isConstructor) {
      return {
        kind: "create" as const,
        decodingMode: "full" as const,
        bytecode: Conversion.toHexString(info.state.calldata)
      };
    } else {
      return {
        kind: "unknown" as const,
        decodingMode: "full" as const,
        data: Conversion.toHexString(info.state.calldata)
      };
    }
  }
  const contextHash = context.context;
  const contractType = Contexts.Import.contextToType(context);
  isConstructor = context.isConstructor;
  const allocations = info.allocations.calldata;
  let allocation: AbiData.Allocate.CalldataAllocation;
  let selector: string;
  //first: is this a creation call?
  if (isConstructor) {
    allocation = (
      allocations.constructorAllocations[contextHash] || { input: undefined }
    ).input;
  } else {
    //skipping any error-handling on this read, as a calldata read can't throw anyway
    let rawSelector = yield* read(
      {
        location: "calldata",
        start: 0,
        length: Evm.Utils.SELECTOR_SIZE
      },
      info.state
    );
    selector = Conversion.toHexString(rawSelector);
    allocation = (
      (allocations.functionAllocations[contextHash] || {})[selector] || {
        input: undefined
      }
    ).input;
  }
  if (allocation === undefined) {
    let abiEntry: Abi.FallbackEntry | Abi.ReceiveEntry | null = null;
    if (info.state.calldata.length === 0) {
      //to hell with reads, let's just be direct
      abiEntry = context.fallbackAbi.receive || context.fallbackAbi.fallback;
    } else {
      abiEntry = context.fallbackAbi.fallback;
    }
    return {
      kind: "message" as const,
      class: contractType,
      abi: abiEntry,
      data: Conversion.toHexString(info.state.calldata),
      decodingMode: "full" as const
    };
  }
  let decodingMode: DecodingMode = allocation.allocationMode; //starts out this way, degrades to ABI if necessary
  debug("calldata decoding mode: %s", decodingMode);
  //you can't map with a generator, so we have to do this map manually
  let decodedArguments: AbiArgument[] = [];
  for (const argumentAllocation of allocation.arguments) {
    let value: Format.Values.Result;
    let dataType =
      decodingMode === "full"
        ? argumentAllocation.type
        : abifyType(argumentAllocation.type, info.userDefinedTypes);
    try {
      value = yield* decode(dataType, argumentAllocation.pointer, info, {
        abiPointerBase: allocation.offset, //note the use of the offset for decoding pointers!
        allowRetry: decodingMode === "full"
      });
    } catch (error) {
      if (
        error instanceof StopDecodingError &&
        error.allowRetry &&
        decodingMode === "full"
      ) {
        debug("problem! retrying as ABI");
        debug("error: %O", error);
        //if a retry happens, we've got to do several things in order to switch to ABI mode:
        //1. mark that we're switching to ABI mode;
        decodingMode = "abi";
        //2. abify all previously decoded values;
        decodedArguments = decodedArguments.map(argumentDecoding => ({
          ...argumentDecoding,
          value: abifyResult(argumentDecoding.value, info.userDefinedTypes)
        }));
        //3. retry this particular decode in ABI mode.
        //(no try/catch on this one because we can't actually handle errors here!
        //not that they should be occurring)
        value = yield* decode(
          abifyType(argumentAllocation.type, info.userDefinedTypes), //type is now abified!
          argumentAllocation.pointer,
          info,
          {
            abiPointerBase: allocation.offset
          }
        );
        //4. the remaining parameters will then automatically be decoded in ABI mode due to (1),
        //so we don't need to do anything special there.
      } else {
        //we shouldn't be getting other exceptions, but if we do, we don't know
        //how to handle them, so uhhhh just rethrow I guess??
        throw error;
      }
    }
    const name = argumentAllocation.name;
    decodedArguments.push(
      name //deliberate general falsiness test
        ? { name, value }
        : { value }
    );
  }
  if (isConstructor) {
    return {
      kind: "constructor" as const,
      class: contractType,
      arguments: decodedArguments,
      abi: <Abi.ConstructorEntry>allocation.abi, //we know it's a constructor, but typescript doesn't
      bytecode: Conversion.toHexString(
        info.state.calldata.slice(0, allocation.offset)
      ),
      decodingMode
    };
  } else {
    return {
      kind: "function" as const,
      class: contractType,
      abi: <Abi.FunctionEntry>allocation.abi, //we know it's a function, but typescript doesn't
      arguments: decodedArguments,
      selector,
      decodingMode
    };
  }
}

/**
 * @Category Decoding
 */
export function* decodeEvent(
  info: Evm.EvmInfo,
  address: string | null, //if null is passed, must pass currentContext in info
  options: LogOptions = {}
): Generator<DecoderRequest, LogDecoding[], Uint8Array> {
  const allocations = info.allocations.event;
  const extras = options.extras || "off";
  let rawSelector: Uint8Array;
  let selector: string;
  let contractAllocations: {
    [contextHash: string]: AbiData.Allocate.EventAllocation[];
  }; //for non-anonymous events
  let libraryAllocations: {
    [contextHash: string]: AbiData.Allocate.EventAllocation[];
  }; //similar
  let contractAnonymousAllocations: {
    [contextHash: string]: AbiData.Allocate.EventAllocation[];
  };
  let libraryAnonymousAllocations: {
    [contextHash: string]: AbiData.Allocate.EventAllocation[];
  };
  const topicsCount = info.state.eventtopics.length;
  //yeah, it's not great to read directly from the state like this (bypassing read), but what are you gonna do?
  if (allocations[topicsCount]) {
    if (topicsCount > 0) {
      rawSelector = yield* read(
        {
          location: "eventtopic",
          topic: 0
        },
        info.state
      );
      selector = Conversion.toHexString(rawSelector);
      if (allocations[topicsCount].bySelector[selector]) {
        ({ contract: contractAllocations, library: libraryAllocations } =
          allocations[topicsCount].bySelector[selector]);
      } else {
        debug("no allocations for that selector!");
        contractAllocations = {};
        libraryAllocations = {};
      }
    } else {
      //if we don't have a selector, it means we don't have any non-anonymous events
      contractAllocations = {};
      libraryAllocations = {};
    }
    //now: let's get our allocations for anonymous events
    ({
      contract: contractAnonymousAllocations,
      library: libraryAnonymousAllocations
    } = allocations[topicsCount].anonymous);
  } else {
    //if there's not even an allocation for the topics count, we can't
    //decode; we could do this the honest way of setting all four allocation
    //objects to {}, but let's just short circuit
    debug("no allocations for that topic count!");
    return [];
  }
  let contractContext: Contexts.Context;
  if (address !== null) {
    //now: what contract are we (probably) dealing with? let's get its code to find out
    const codeBytes: Uint8Array = yield {
      type: "code",
      address
    };
    const codeAsHex = Conversion.toHexString(codeBytes);
    contractContext = Contexts.Utils.findContext(info.contexts, codeAsHex);
  } else {
    contractContext = info.currentContext;
  }
  let possibleContractAllocations: AbiData.Allocate.EventAllocation[]; //excludes anonymous events
  let possibleContractAnonymousAllocations: AbiData.Allocate.EventAllocation[];
  let possibleExtraAllocations: AbiData.Allocate.EventAllocation[]; //excludes anonymous events
  let possibleExtraAnonymousAllocations: AbiData.Allocate.EventAllocation[];
  const emittingContextHash = (contractContext || { context: undefined })
    .context;
  if (emittingContextHash) {
    //if we found the contract, maybe it's from that contract
    const contractAllocation = contractAllocations[emittingContextHash];
    const contractAnonymousAllocation =
      contractAnonymousAllocations[emittingContextHash];
    possibleContractAllocations = contractAllocation || [];
    possibleContractAnonymousAllocations = contractAnonymousAllocation || [];
    //also, we need to set up the extras (everything that's from a
    //non-library contract but *not* this one)
    possibleExtraAllocations = [].concat(
      ...Object.entries(contractAllocations)
        .filter(([key, _]) => key !== emittingContextHash)
        .map(([_, value]) => value)
    );
    possibleExtraAnonymousAllocations = [].concat(
      ...Object.entries(contractAnonymousAllocations)
        .filter(([key, _]) => key !== emittingContextHash)
        .map(([_, value]) => value)
    );
  } else {
    //if we couldn't determine the contract, well, we have to assume it's from a library
    debug("couldn't find context");
    possibleContractAllocations = [];
    possibleContractAnonymousAllocations = [];
    //or it's an extra, which could be any of the contracts
    possibleExtraAllocations = [].concat(...Object.values(contractAllocations));
    possibleExtraAnonymousAllocations = [].concat(
      ...Object.values(contractAnonymousAllocations)
    );
  }
  //now we get all the library allocations!
  const possibleLibraryAllocations = [].concat(
    ...Object.values(libraryAllocations)
  );
  const possibleLibraryAnonymousAllocations = [].concat(
    ...Object.values(libraryAnonymousAllocations)
  );
  //now we put it all together!
  const possibleAllocations = possibleContractAllocations.concat(
    possibleLibraryAllocations
  );
  const possibleAnonymousAllocations =
    possibleContractAnonymousAllocations.concat(
      possibleLibraryAnonymousAllocations
    );
  const possibleAllocationsTotalMinusExtras = possibleAllocations.concat(
    possibleAnonymousAllocations
  );
  //...and also there's the extras
  const possibleExtraAllocationsTotal = possibleExtraAllocations.concat(
    possibleExtraAnonymousAllocations
  );
  const possibleAllocationsTotal = possibleAllocationsTotalMinusExtras.concat(
    [null], //HACK: add sentinel value before the extras
    possibleExtraAllocationsTotal
  );
  //whew!
  let decodings: LogDecoding[] = [];
  allocationAttempts: for (const allocation of possibleAllocationsTotal) {
    debug("trying allocation: %O", allocation);
    //first: check for our sentinel value for extras (yeah, kind of HACKy)
    if (allocation === null) {
      switch (extras) {
        case "on":
          continue allocationAttempts; //ignore the sentinel and continue
        case "off":
          break allocationAttempts; //don't include extras; stop here
        case "necessary":
          //stop on the sentinel and exclude extras *unless* there are no decodings yet
          if (decodings.length > 0) {
            break allocationAttempts;
          } else {
            continue allocationAttempts;
          }
      }
    }
    //second: do a name check so we can skip decoding if name is wrong
    //(this will likely be a more detailed check in the future)
    if (options.name !== undefined && allocation.abi.name !== options.name) {
      continue;
    }
    //now: the main part!
    let decodingMode: DecodingMode = allocation.allocationMode; //starts out here; degrades to abi if necessary
    const contextHash = allocation.contextHash;
    const attemptContext = info.contexts[contextHash];
    const emittingContractType = Contexts.Import.contextToType(attemptContext);
    const contractType = allocation.definedIn;
    //you can't map with a generator, so we have to do this map manually
    let decodedArguments: AbiArgument[] = [];
    for (const argumentAllocation of allocation.arguments) {
      let value: Format.Values.Result;
      //if in full mode, use the allocation's listed data type.
      //if in ABI mode, abify it before use.
      let dataType =
        decodingMode === "full"
          ? argumentAllocation.type
          : abifyType(argumentAllocation.type, info.userDefinedTypes);
      try {
        value = yield* decode(dataType, argumentAllocation.pointer, info, {
          strictAbiMode: true, //turns on STRICT MODE to cause more errors to be thrown
          allowRetry: decodingMode === "full" //this option is unnecessary but including for clarity
        });
      } catch (error) {
        if (
          error instanceof StopDecodingError &&
          error.allowRetry &&
          decodingMode === "full"
        ) {
          //if a retry happens, we've got to do several things in order to switch to ABI mode:
          //1. mark that we're switching to ABI mode;
          decodingMode = "abi";
          //2. abify all previously decoded values;
          decodedArguments = decodedArguments.map(argumentDecoding => ({
            ...argumentDecoding,
            value: abifyResult(argumentDecoding.value, info.userDefinedTypes)
          }));
          //3. retry this particular decode in ABI mode.
          try {
            value = yield* decode(
              abifyType(argumentAllocation.type, info.userDefinedTypes), //type is now abified!
              argumentAllocation.pointer,
              info,
              {
                strictAbiMode: true //turns on STRICT MODE to cause more errors to be thrown
                //retries no longer allowed, not that this has an effect
              }
            );
          } catch (_) {
            //if an error occurred on the retry, this isn't a valid decoding!
            debug("rejected due to exception on retry");
            continue allocationAttempts;
          }
          //4. the remaining parameters will then automatically be decoded in ABI mode due to (1),
          //so we don't need to do anything special there.
        } else {
          //if any other sort of error occurred, this isn't a valid decoding!
          debug("rejected due to exception on first try: %O", error);
          continue allocationAttempts;
        }
      }
      const name = argumentAllocation.name;
      const indexed = argumentAllocation.pointer.location === "eventtopic";
      decodedArguments.push(
        name //deliberate general falsiness test
          ? { name, indexed, value }
          : { indexed, value }
      );
    }
    if (!options.disableChecks) {
      //OK, so, having decoded the result, the question is: does it reencode to the original?
      //NOTE: we skip this check if disableChecks is passed! (it shouldn't be passed :P )
      //first, we have to filter out the indexed arguments, and also get rid of the name information
      const nonIndexedValues = decodedArguments
        .filter(argument => !argument.indexed)
        .map(argument => argument.value);
      //now, we can encode!
      const reEncodedData = AbiData.Encode.encodeTupleAbi(
        nonIndexedValues,
        info.allocations.abi
      );
      const encodedData = info.state.eventdata; //again, not great to read this directly, but oh well
      //are they equal?
      if (!Evm.Utils.equalData(reEncodedData, encodedData)) {
        //if not, this allocation doesn't work
        debug("rejected due to [non-indexed] mismatch");
        continue;
      }
    }
    //one last check -- let's check that the indexed arguments match up, too
    //(we won't skip this even if disableChecks was passed)
    const indexedValues = decodedArguments
      .filter(argument => argument.indexed)
      .map(argument => argument.value);
    const reEncodedTopics = indexedValues.map(Topic.Encode.encodeTopic);
    const encodedTopics = info.state.eventtopics;
    //now: do *these* match?
    const selectorAdjustment = allocation.anonymous ? 0 : 1;
    for (let i = 0; i < reEncodedTopics.length; i++) {
      if (
        !Evm.Utils.equalData(
          reEncodedTopics[i],
          encodedTopics[i + selectorAdjustment]
        )
      ) {
        debug("rejected due to indexed mismatch");
        continue allocationAttempts;
      }
    }
    //if we've made it here, the allocation works!  hooray!
    debug("allocation accepted!");
    let decoding: LogDecoding;
    if (allocation.abi.anonymous) {
      decoding = {
        kind: "anonymous",
        definedIn: contractType,
        class: emittingContractType,
        abi: allocation.abi,
        arguments: decodedArguments,
        decodingMode
      };
    } else {
      decoding = {
        kind: "event",
        definedIn: contractType,
        class: emittingContractType,
        abi: allocation.abi,
        arguments: decodedArguments,
        selector,
        decodingMode
      };
    }
    decodings.push(decoding);
    //if we've made this far (so this allocation works), and we were passed an
    //ID, and it matches this ID, bail out & return this as the *only* decoding
    if (options.id && allocation.id === options.id) {
      return [decoding];
    }
  }
  return decodings;
}

const errorSelector: Uint8Array = Conversion.toBytes(
  Web3Utils.soliditySha3({
    type: "string",
    value: "Error(string)"
  })
).subarray(0, Evm.Utils.SELECTOR_SIZE);

const panicSelector: Uint8Array = Conversion.toBytes(
  Web3Utils.soliditySha3({
    type: "string",
    value: "Panic(uint256)"
  })
).subarray(0, Evm.Utils.SELECTOR_SIZE);

const defaultRevertAllocations: AbiData.Allocate.ReturndataAllocation[] = [
  {
    kind: "revert" as const,
    allocationMode: "full" as const,
    selector: errorSelector,
    abi: {
      name: "Error",
      type: "error",
      inputs: [
        {
          name: "",
          type: "string",
          internalType: "string"
        }
      ]
    },
    definedIn: null,
    arguments: [
      {
        name: "",
        pointer: {
          location: "returndata" as const,
          start: errorSelector.length,
          length: Evm.Utils.WORD_SIZE
        },
        type: {
          typeClass: "string" as const,
          typeHint: "string"
        }
      }
    ]
  },
  {
    kind: "revert" as const,
    allocationMode: "full" as const,
    selector: panicSelector,
    abi: {
      name: "Panic",
      type: "error",
      inputs: [
        {
          name: "",
          type: "uint256",
          internalType: "uint256"
        }
      ]
    },
    definedIn: null,
    arguments: [
      {
        name: "",
        pointer: {
          location: "returndata" as const,
          start: panicSelector.length,
          length: Evm.Utils.WORD_SIZE
        },
        type: {
          typeClass: "uint" as const,
          bits: Evm.Utils.WORD_SIZE * 8, // :)
          typeHint: "uint256"
        }
      }
    ]
  }
];

const defaultEmptyAllocations: AbiData.Allocate.ReturndataAllocation[] = [
  {
    kind: "failure" as const,
    allocationMode: "full" as const,
    selector: new Uint8Array(), //empty by default
    arguments: []
  },
  {
    kind: "selfdestruct" as const,
    allocationMode: "full" as const,
    selector: new Uint8Array(), //empty by default
    arguments: []
  }
];

/**
 * If there are multiple possibilities, they're always returned in
 * the order: return, revert, returnmessage, failure, empty, bytecode, unknownbytecode
 * Moreover, within "revert", builtin ones are put above custom ones
 * @Category Decoding
 */
export function* decodeReturndata(
  info: Evm.EvmInfo,
  successAllocation: AbiData.Allocate.ReturndataAllocation | null, //null here must be explicit
  status?: boolean, //you can pass this to indicate that you know the status,
  id?: string //useful when status = false
): Generator<DecoderRequest, ReturndataDecoding[], Uint8Array> {
  let possibleAllocations: AbiData.Allocate.ReturndataAllocation[];
  const selector = Conversion.toHexString(info.state.returndata.slice(0, 4));
  const contextHash = (info.currentContext || { context: "" }).context; //HACK: "" is used to represent no context
  const customRevertAllocations =
    ((info.allocations.returndata || { [contextHash]: {} })[contextHash] || {
      [selector]: []
    })[selector] || [];
  if (successAllocation === null) {
    possibleAllocations = [
      ...defaultRevertAllocations,
      ...customRevertAllocations,
      ...defaultEmptyAllocations
    ];
  } else {
    switch (successAllocation.kind) {
      case "return":
        possibleAllocations = [
          successAllocation,
          ...defaultRevertAllocations,
          ...customRevertAllocations,
          ...defaultEmptyAllocations
        ];
        break;
      case "bytecode":
        possibleAllocations = [
          ...defaultRevertAllocations,
          ...customRevertAllocations,
          ...defaultEmptyAllocations,
          successAllocation
        ];
        break;
      case "returnmessage":
        possibleAllocations = [
          ...defaultRevertAllocations,
          ...customRevertAllocations,
          successAllocation,
          ...defaultEmptyAllocations
        ];
        break;
      //Other cases shouldn't happen so I'm leaving them to cause errors!
    }
  }
  let decodings: ReturndataDecoding[] = [];
  allocationAttempts: for (const allocation of possibleAllocations) {
    debug("trying allocation: %O", allocation);
    //before we attempt to use this allocation, we check: does the selector match?
    let encodedData = info.state.returndata; //again, not great to read this directly, but oh well
    const encodedPrefix = encodedData.subarray(0, allocation.selector.length);
    if (!Evm.Utils.equalData(encodedPrefix, allocation.selector)) {
      continue;
    }
    encodedData = encodedData.subarray(allocation.selector.length); //slice off the selector for later
    //also we check, does the status match?
    if (status !== undefined) {
      const successKinds = [
        "return",
        "selfdestruct",
        "bytecode",
        "returnmessage"
      ];
      const failKinds = ["failure", "revert"];
      if (status) {
        if (!successKinds.includes(allocation.kind)) {
          continue;
        }
      } else {
        if (!failKinds.includes(allocation.kind)) {
          continue;
        }
      }
    }
    if (allocation.kind === "bytecode") {
      //bytecode is special and can't really be integrated with the other cases.
      //so it gets its own function.
      const decoding = yield* decodeBytecode(info);
      if (decoding) {
        decodings.push(decoding);
      }
      continue;
    }
    if (allocation.kind === "returnmessage") {
      //this kind is also special, though thankfully it's easier
      const decoding = {
        kind: "returnmessage" as const,
        status: true as const,
        data: Conversion.toHexString(info.state.returndata),
        decodingMode: allocation.allocationMode
      };
      decodings.push(decoding);
      continue;
    }
    let decodingMode: DecodingMode = allocation.allocationMode; //starts out here; degrades to abi if necessary
    //you can't map with a generator, so we have to do this map manually
    let decodedArguments: AbiArgument[] = [];
    for (const argumentAllocation of allocation.arguments) {
      let value: Format.Values.Result;
      //if in full mode, use the allocation's listed data type.
      //if in ABI mode, abify it before use.
      let dataType =
        decodingMode === "full"
          ? argumentAllocation.type
          : abifyType(argumentAllocation.type, info.userDefinedTypes);
      //now, let's decode!
      try {
        value = yield* decode(dataType, argumentAllocation.pointer, info, {
          abiPointerBase: allocation.selector.length,
          strictAbiMode: true, //turns on STRICT MODE to cause more errors to be thrown
          allowRetry: decodingMode === "full" //this option is unnecessary but including for clarity
        });
        debug("value on first try: %O", value);
      } catch (error) {
        if (
          error instanceof StopDecodingError &&
          error.allowRetry &&
          decodingMode === "full"
        ) {
          debug("retry!");
          //if a retry happens, we've got to do several things in order to switch to ABI mode:
          //1. mark that we're switching to ABI mode;
          decodingMode = "abi";
          //2. abify all previously decoded values;
          decodedArguments = decodedArguments.map(argumentDecoding => ({
            ...argumentDecoding,
            value: abifyResult(argumentDecoding.value, info.userDefinedTypes)
          }));
          //3. retry this particular decode in ABI mode.
          try {
            value = yield* decode(
              abifyType(argumentAllocation.type, info.userDefinedTypes), //type is now abified!
              argumentAllocation.pointer,
              info,
              {
                abiPointerBase: allocation.selector.length,
                strictAbiMode: true //turns on STRICT MODE to cause more errors to be thrown
                //retries no longer allowed, not that this has an effect
              }
            );
            debug("value on retry: %O", value);
          } catch (_) {
            //if an error occurred on the retry, this isn't a valid decoding!
            debug("rejected due to exception on retry");
            continue allocationAttempts;
          }
          //4. the remaining parameters will then automatically be decoded in ABI mode due to (1),
          //so we don't need to do anything special there.
        } else {
          //if any other sort of error occurred, this isn't a valid decoding!
          debug("rejected due to exception on first try: %O", error);
          continue allocationAttempts;
        }
      }
      const name = argumentAllocation.name;
      decodedArguments.push(
        name //deliberate general falsiness test
          ? { name, value }
          : { value }
      );
    }
    //OK, so, having decoded the result, the question is: does it reencode to the original?
    //first, we have to filter out the indexed arguments, and also get rid of the name information
    debug("decodedArguments: %O", decodedArguments);
    const decodedArgumentValues = decodedArguments.map(
      argument => argument.value
    );
    const reEncodedData = AbiData.Encode.encodeTupleAbi(
      decodedArgumentValues,
      info.allocations.abi
    );
    //are they equal? note the selector has been stripped off encodedData!
    if (!Evm.Utils.equalData(reEncodedData, encodedData)) {
      //if not, this allocation doesn't work
      debug("rejected due to mismatch");
      continue;
    }
    //if we've made it here, the allocation works!  hooray!
    debug("allocation accepted!");
    let decoding: ReturndataDecoding;
    switch (allocation.kind) {
      case "return":
        decoding = {
          kind: "return" as const,
          status: true as const,
          arguments: decodedArguments,
          decodingMode
        };
        break;
      case "revert":
        decoding = {
          kind: "revert" as const,
          abi: allocation.abi,
          definedIn: allocation.definedIn,
          status: false as const,
          arguments: decodedArguments,
          decodingMode
        };
        break;
      case "selfdestruct":
        decoding = {
          kind: "selfdestruct" as const,
          status: true as const,
          decodingMode
        };
        break;
      case "failure":
        decoding = {
          kind: "failure" as const,
          status: false as const,
          decodingMode
        };
        break;
    }
    decodings.push(decoding);
    //if we've made this far (so this allocation works), and we were passed an
    //ID, and it matches this ID, bail out & return this as the *only* decoding
    if (id && allocation.kind === "revert" && allocation.id === id) {
      return [decoding];
    }
  }
  return decodings;
}

//note: requires the bytecode to be in returndata, not code
function* decodeBytecode(
  info: Evm.EvmInfo
): Generator<
  DecoderRequest,
  BytecodeDecoding | UnknownBytecodeDecoding | null,
  Uint8Array
> {
  let decodingMode: DecodingMode = "full"; //as always, degrade as necessary
  const bytecode = Conversion.toHexString(info.state.returndata);
  const context = Contexts.Utils.findContext(info.contexts, bytecode);
  if (!context) {
    return {
      kind: "unknownbytecode" as const,
      status: true as const,
      decodingMode: "full" as const,
      bytecode
    };
  }
  const contractType = Contexts.Import.contextToType(context);
  //now: ignore original allocation (which we didn't even pass :) )
  //and lookup allocation by context
  const allocation =
    info.allocations.calldata.constructorAllocations[context.context].output;
  debug("bytecode allocation: %O", allocation);
  //now: add immutables if applicable
  let immutables: StateVariable[] | undefined;
  if (allocation.immutables) {
    immutables = [];
    //NOTE: if we're in here, we can assume decodingMode === "full"
    for (const variable of allocation.immutables) {
      const dataType = variable.type; //we don't conditioning on decodingMode here because we know it
      let value: Format.Values.Result;
      try {
        value = yield* decode(dataType, variable.pointer, info, {
          allowRetry: true, //we know we're in full mode
          strictAbiMode: true,
          paddingMode: "defaultOrZero"
        });
      } catch (error) {
        if (error instanceof StopDecodingError && error.allowRetry) {
          //we "retry" by... not bothering with immutables :P
          //(but we do set the mode to ABI)
          decodingMode = "abi";
          immutables = undefined;
          break;
        } else {
          //otherwise, this isn't a valid decoding I guess
          return null;
        }
      }
      immutables.push({
        name: variable.name,
        class: variable.definedIn,
        value
      });
    }
  }
  let decoding: BytecodeDecoding = {
    kind: "bytecode" as const,
    status: true as const,
    decodingMode,
    bytecode,
    immutables,
    class: contractType
  };
  //finally: add address if applicable
  if (allocation.delegatecallGuard) {
    decoding.address = Web3Utils.toChecksumAddress(
      bytecode.slice(4, 4 + 2 * Evm.Utils.ADDRESS_SIZE) //4 = "0x73".length
    );
  }
  return decoding;
}

/**
 * Decodes the return data from a failed call.
 *
 * @param returndata The returned data, as a Uint8Array.
 * @return An array of possible decodings.  At the moment it's
 *   impossible for there to be more than one.  (If the call didn't actually
 *   fail, or failed in a nonstandard way, you may get no decodings at all, though!)
 *
 *   Decodings can either be decodings of revert messages, or decodings
 *   indicating that there was no revert message.  If somehow both were to be
 *   possible, they'd go in that order, although as mentioned, there (at least
 *   currently) isn't any way for that to occur.
 * @Category Decoding convenience
 */
export function decodeRevert(returndata: Uint8Array): ReturndataDecoding[] {
  //coercing because TS doesn't know it'll finish in one go
  return <ReturndataDecoding[]>decodeReturndata(
    {
      allocations: {},
      state: {
        storage: {},
        returndata
      }
    },
    null,
    false
  ).next().value;
}
