import debugModule from "debug";
const debug = debugModule("codec:wrap:wrap");

import * as Format from "@truffle/codec/format";
import { TypeMismatchError } from "./errors";
import {
  WrapRequest,
  WrapResponse,
  AddressWrapRequest
} from "../types";
import {
  TupleLikeType,
  TupleLikeValue,
  WrapOptions
} from "./types";
import {
  wrapBool,
  wrapString,
  wrapBytes,
  wrapIntegerOrEnum,
  wrapDecimal,
  wrapAddress,
  errorResultMessage,
  checksumFailedMessage,
  wrappedTypeMessage,
  specifiedTypeMessage,
  notABytestringMessage,
  wrongLengthMessage,
  byteStringPattern
} from "./elementary";
import * as Conversion from "@truffle/codec/conversion";
import * as Utils from "./utils";
import * as EvmUtils from "@truffle/codec/evm/utils";
import * as Common from "@truffle/codec/common";
import BN from "bn.js";
import isString from "lodash.isstring"; //recognizes string *or* String
const Web3Utils = require("web3-utils"); //importing untyped, sorry!

function wrongArrayLengthMessage(expected: number | BN, got: number): string {
  return `Incorrect array length (expected ${expected.toString()} entries, got ${got})`;
}
const base64Pattern = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}([A-Za-z0-9+/]|=)=)?$/; //Vim's syntax highlighting is wrong here
function base64Length(base64: string): number {
  const [_, endingEquals] = base64.match(/(=*)$/); //note this match always succeeds
  return (base64.length * 3) / 4 - endingEquals.length;
}

export function* wrap(
  dataType: Format.Types.Type,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<WrapRequest, Format.Values.Value, WrapResponse> {
  if (!wrapOptions.name) {
    wrapOptions = { ...wrapOptions, name: "<input>" };
  }
  debug("dataType.typeClass: %s", dataType.typeClass);
  switch (dataType.typeClass) {
    case "uint":
    case "int":
    case "enum":
      //these aren't quite the same, but the differences will be handled
      //in the common function
      return yield* wrapIntegerOrEnum(dataType, input, wrapOptions);
    case "fixed":
    case "ufixed":
      return yield* wrapDecimal(dataType, input, wrapOptions);
    case "bool":
      return wrapBool(dataType, input, wrapOptions);
    case "bytes":
      return wrapBytes(dataType, input, wrapOptions);
    case "address":
    case "contract":
      //we'll treat these the same
      return yield* wrapAddress(dataType, input, wrapOptions);
    case "string":
      return wrapString(dataType, input, wrapOptions);
    case "array":
      return yield* wrapArray(dataType, input, wrapOptions);
    case "tuple":
    case "struct":
      //we'll handle these similarly as well
      return yield* wrapTuple(dataType, input, wrapOptions);
    case "function":
      //we coerce here because we're not handling internal functions
      return yield* wrapFunctionExternal(
        <Format.Types.FunctionExternalType>dataType,
        input,
        wrapOptions
      );
    case "options":
      return yield* wrapTxOptions(dataType, input, wrapOptions);
  }
}

function* wrapArray(
  dataType: Format.Types.ArrayType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<WrapRequest, Format.Values.ArrayValue, WrapResponse> {
  let value: Format.Values.Value[] = [];
  if (Array.isArray(input)) {
    if (dataType.kind === "dynamic" || dataType.length.eqn(input.length)) {
      //can't do yield in a map, so manual loop here
      for (let index = 0; index < input.length; index++) {
        value.push(
          yield* wrap(
            dataType.baseType,
            input[index],
            { ...wrapOptions, name: `${wrapOptions.name}[${index}]` } //set new name for components
          )
        );
      }
    } else {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        wrongArrayLengthMessage(dataType.length, input.length)
      );
    }
  } else if (Utils.isWrappedResult(input)) {
    //1. is it already wrapped, and matches the requested type?
    //(we won't bother with detailed typechecking as much of it is handled
    //elsewhere; we will check dynamic vs static though as that isn't)
    switch (input.kind) {
      case "value":
        if (input.type.typeClass === "array") {
          if (!wrapOptions.loose && input.type.kind === dataType.kind) {
            throw new TypeMismatchError(
              dataType,
              input,
              wrapOptions.name,
              wrappedTypeMessage(input.type)
            );
          } else {
            return yield* wrapArray(dataType, input.value, wrapOptions);
          }
        } else {
          throw new TypeMismatchError(
            dataType,
            input,
            wrapOptions.name,
            wrappedTypeMessage(input.type)
          );
        }
      case "error":
        throw new TypeMismatchError(
          dataType,
          input,
          wrapOptions.name,
          errorResultMessage
        );
    }
  } else if (Utils.isTypeValueInput(input)) {
    //2. is it a type/value?
    //if so wrap input.value
    //don't turn on loose here, only do that for non-container types!
    if (input.type === "array") {
      return yield* wrapArray(dataType, input.value, wrapOptions);
    } else {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        specifiedTypeMessage(input.type)
      );
    }
  } else {
    //we don't know what it is
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      "Input was not an array, type/value pair or wrapped array"
    );
  }
  return {
    type: dataType,
    kind: "value" as const,
    value
  };
}

//even with loose turned off, we won't distinguish
//between tuples and structs
function* wrapTuple(
  dataType: TupleLikeType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<WrapRequest, TupleLikeValue, WrapResponse> {
  let memberTypes: Format.Types.OptionallyNamedType[];
  switch (dataType.typeClass) {
    case "tuple":
      memberTypes = dataType.memberTypes;
      break;
    case "struct":
      debug("wrapping for struct %s", dataType.typeName);
      memberTypes = (<Format.Types.StructType>(
        Format.Types.fullType(dataType, wrapOptions.userDefinedTypes)
      )).memberTypes;
      break;
  }
  debug("memberTypes: %O", memberTypes);
  let value: Format.Values.OptionallyNamedValue[] = [];
  if (Array.isArray(input)) {
    debug("input is array");
    if (memberTypes.length === input.length) {
      //can't do yield in a map, so manual loop here
      for (let index = 0; index < input.length; index++) {
        const memberName = memberTypes[index].name;
        debug("wrapping %s", memberName);
        value.push({
          name: memberName,
          value: yield* wrap(memberTypes[index].type, input[index], {
            ...wrapOptions,
            name: memberName
              ? wrapOptions.name.match(/^<.*>$/) //hack?
                ? memberName
                : `${wrapOptions.name}.${memberName}`
              : `${wrapOptions.name}[${index}]`
          })
        });
      }
    } else {
      debug("input is wrong-length array");
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        wrongArrayLengthMessage(memberTypes.length, input.length)
      );
    }
  } else if (Utils.isWrappedResult(input)) {
    //1. is it already wrapped, and matches the requested type?
    //not going to do much typechecking here as it'll be handled on recursion
    switch (input.kind) {
      case "value":
        switch (input.type.typeClass) {
          case "tuple":
          case "struct":
            let coercedInput = <Format.Values.TupleValue>input; //HACK!
            //Typescript complains if I try to say it can be either struct or
            //tuple, so, uh, let's just tell it it's a tuple <shrug>
            return yield* wrapTuple(
              dataType,
              coercedInput.value.map(({ value }) => value),
              wrapOptions
            );
          default:
            throw new TypeMismatchError(
              dataType,
              input,
              wrapOptions.name,
              wrappedTypeMessage(input.type)
            );
        }
      case "error":
        throw new TypeMismatchError(
          dataType,
          input,
          wrapOptions.name,
          errorResultMessage
        );
    }
  } else if (Utils.isTypeValueInput(input)) {
    //2. is it a type/value?
    //if so wrap input.value
    //don't turn on loose here, only do that for non-container types!
    if (input.type === "struct" || input.type === "tuple") {
      return yield* wrapTuple(dataType, input.value, wrapOptions);
    } else {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        specifiedTypeMessage(input.type)
      );
    }
  } else if (Utils.isPlainObject(input)) { //just checks that it's an object & not null
    if (memberTypes.some(({ name }) => !name)) {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        "Plain object input is not allowed when not all elements of tuple are named"
      );
    }
    let unusedKeys = new Set(Object.keys(input));
    for (let index = 0; index < memberTypes.length; index++) {
      //note we had better process these in order!
      const memberName = memberTypes[index].name;
      if (!(memberName in input)) {
        throw new TypeMismatchError(
          dataType,
          input,
          wrapOptions.name,
          `Missing key from tuple or struct: ${memberName}`
        );
      }
      unusedKeys.delete(memberName);
      value.push({
        name: memberName,
        value: yield* wrap(memberTypes[index].type, input[memberName], {
          ...wrapOptions,
          name: `${wrapOptions.name}.${memberName}`
        })
      });
    }
    if (!wrapOptions.loose) {
      if (unusedKeys.size > 0) {
        //choose one arbitrarily
        const exampleKey = unusedKeys.values().next().value;
        throw new TypeMismatchError(
          dataType,
          input,
          wrapOptions.name,
          `Unknown key ${exampleKey} included`
        );
      }
    }
  } else {
    //we don't know what it is
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      "Input was not an array, plain object, type/value pair or wrapped tuple or struct"
    );
  }
  //we need to coerce here because TS doesn't know that if it's a struct
  //then everything has a name
  return <TupleLikeValue>{
    type: dataType,
    kind: "value" as const,
    value
  };
}

function* wrapFunctionExternal(
  dataType: Format.Types.FunctionExternalType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<
  AddressWrapRequest,
  Format.Values.FunctionExternalValue,
  WrapResponse
> {
  let address: string, selector: string;
  if (Utils.isWrappedResult(input)) {
    //1. is it already wrapped?
    switch (input.kind) {
      case "value":
        if (
          input.type.typeClass !== "function" ||
          input.type.visibility !== "external"
        ) {
          throw new TypeMismatchError(
            dataType,
            input,
            wrapOptions.name,
            wrappedTypeMessage(input.type)
          );
        }
        const coercedInput = <Format.Values.FunctionExternalValue>input;
        address = coercedInput.value.contract.address;
        selector = coercedInput.value.selector;
        break;
      case "error":
        throw new TypeMismatchError(
          dataType,
          input,
          wrapOptions.name,
          errorResultMessage
        );
    }
  } else if (Utils.isTypeValueInput(input)) {
    //2. is it a type/value?
    //if so wrap input.value (with loose on so strings will work)
    if (input.type !== "function") {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        specifiedTypeMessage(input.type)
      );
    }
    //because function, unlike other "containers", has specific types, we will turn on loose
    return yield* wrapFunctionExternal(dataType, input.value, {
      ...wrapOptions,
      loose: true
    });
  } else if (Utils.isFunctionExternalInput(input)) {
    //we'll treat address and selector like sub-variables
    const wrappedAddress = <Format.Values.AddressValue>(
      yield* wrapAddress(
        { typeClass: "address", kind: "general" },
        input.address,
        {
          ...wrapOptions,
          name: `${wrapOptions.name}.address`
        }
      )
    );
    address = wrappedAddress.value.asAddress;
    const wrappedSelector = wrapBytes(
      { typeClass: "bytes", kind: "static", length: 4 },
      input.selector,
      {
        ...wrapOptions,
        name: `${wrapOptions.name}.selector`
      }
    );
    selector = wrappedSelector.value.asHex;
  } else if (typeof input === "string") {
    //we'll allow a raw bytestring in this case
    //note in this case, unlike the other cases, we mostly handle validation up front
    if (!input.match(byteStringPattern)) {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        "Input was a string, but not a valid even-length hex string"
      );
    }
    if (
      input.length !==
      2 + 2 * (EvmUtils.ADDRESS_SIZE + EvmUtils.SELECTOR_SIZE)
    ) {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        wrongLengthMessage(
          "external function was given as a string but",
          EvmUtils.ADDRESS_SIZE + EvmUtils.SELECTOR_SIZE,
          (input.length - 2) / 2
        )
      );
    }
    address = input.slice(0, EvmUtils.ADDRESS_SIZE * 2 + 2).toLowerCase(); //bypass checksum validation here
    selector = "0x" + input.slice(EvmUtils.ADDRESS_SIZE * 2 + 2).toLowerCase();
  } else if (isString(input)) {
    return yield* wrapFunctionExternal(dataType, input.valueOf(), wrapOptions);
  } else {
    //we don't know what it is
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      "Input should be one of: an object with address and selector; a 24-byte hex string; a type/value pair; or a wrapped external function"
    );
  }
  //now: validate the address
  if (!address.match(byteStringPattern)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      notABytestringMessage("Address")
    );
  }
  if (address.length !== 2 * EvmUtils.ADDRESS_SIZE + 2) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      wrongLengthMessage(
        "address",
        EvmUtils.ADDRESS_SIZE,
        (address.length - 2) / 2
      )
    );
  }
  if (!Web3Utils.isAddress(address)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      checksumFailedMessage
    );
  }
  //normalize the address
  address = Web3Utils.toChecksumAddress(address);
  //validate the selector
  if (!selector.match(byteStringPattern)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      notABytestringMessage("Selector")
    );
  }
  if (selector.length !== 2 * EvmUtils.SELECTOR_SIZE + 2) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      wrongLengthMessage(
        "selector",
        EvmUtils.SELECTOR_SIZE,
        (selector.length - 2) / 2
      )
    );
  }
  return {
    type: dataType,
    kind: "value" as const,
    value: {
      kind: "unknown" as const,
      contract: {
        kind: "unknown" as const,
        address
      },
      selector
    }
  };
}

//not called wrapOptions to avoid name collision there!
function* wrapTxOptions(
  dataType: Format.Types.OptionsType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<WrapRequest, Format.Values.OptionsValue, WrapResponse> {
  let value: Common.Options = {};
  if (Utils.isWrappedResult(input)) {
    //1. is it already wrapped?
    switch (input.kind) {
      case "value":
        if (input.type.typeClass === "options") {
          value = (<Format.Values.OptionsValue>input).value;
        } else {
          throw new TypeMismatchError(
            dataType,
            input,
            wrapOptions.name,
            wrappedTypeMessage(input.type)
          );
        }
        break;
      case "error":
        throw new TypeMismatchError(
          dataType,
          input,
          wrapOptions.name,
          errorResultMessage
        );
    }
  } else if (Utils.isTypeValueInput(input)) {
    //2. is it a type/value?
    //because options, unlike other containers, has specific types, we will turn on loose
    if (input.type === "options") {
      return yield* wrapTxOptions(dataType, input.value, {
        ...wrapOptions,
        loose: true
      });
    } else {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        specifiedTypeMessage(input.type)
      );
    }
  } else if (Utils.isPlainObject(input)) { //just checks if it's an object & not null
    const uintKeys = ["gas", "gasPrice", "value", "nonce"] as const;
    const addressKeys = ["from", "to"] as const;
    const bytesKeys = ["data"] as const;
    const boolKeys = ["overwrite"] as const;
    const specialKeys = ["privateFor"];
    const allKeys = [
      ...uintKeys,
      ...addressKeys,
      ...bytesKeys,
      ...boolKeys,
      ...specialKeys
    ];
    const badKey = Object.keys(input).find(key => !allKeys.includes(key));
    const goodKey = Object.keys(input).find(key => allKeys.includes(key));
    if (badKey !== undefined && !wrapOptions.oldOptionsBehavior) {
      //note we allow extra keys if oldOptionsBehavior is on -- this is a HACK
      //to preserve existing behavior of Truffle Contract (perhaps we can
      //change this in Truffle 6)
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        `Transaction options included unknown option ${badKey}`
      );
    }
    if (wrapOptions.oldOptionsBehavior && goodKey === undefined) {
      //similarly, if oldOptionsBehavior is on, we require at least
      //one *legit* key (again, HACK to preserve existing behavior,
      //maybe remove this in Truffle 6)
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        `Transaction options included no recognized options`
      );
    }
    //otherwise, if all keys are transaction options, let's process them...
    //part 1: uint options
    for (const key of uintKeys) {
      //note we check input[key] !== undefined, rather than key in input,
      //because if one of them is undefined we want to just allow that but ignore it
      if (input[key] !== undefined) {
        const wrappedOption = <Format.Values.UintValue>(
          yield* wrapIntegerOrEnum(
            { typeClass: "uint", bits: 256 },
            input[key],
            { ...wrapOptions, name: `${wrapOptions.name}.${key}` }
          )
        );
        value[key] = wrappedOption.value.asBN;
      }
    }
    //part 2: address options
    for (const key of addressKeys) {
      if (input[key] !== undefined) {
        const wrappedOption = <Format.Values.AddressValue>(
          yield* wrapAddress(
            { typeClass: "address", kind: "general" },
            input[key],
            { ...wrapOptions, name: `${wrapOptions.name}.${key}` }
          )
        );
        value[key] = wrappedOption.value.asAddress;
      }
    }
    //part 3: bytestring options
    for (const key of bytesKeys) {
      if (input[key] !== undefined) {
        const wrappedOption = wrapBytes(
          { typeClass: "bytes", kind: "dynamic" },
          input[key],
          { ...wrapOptions, name: `${wrapOptions.name}.${key}` }
        );
        value[key] = wrappedOption.value.asHex;
      }
    }
    //part 3: boolean options
    for (const key of boolKeys) {
      if (input[key] !== undefined) {
        const wrappedOption = wrapBool({ typeClass: "bool" }, input[key], {
          ...wrapOptions,
          name: `${wrapOptions.name}.${key}`
        });
        value[key] = wrappedOption.value.asBoolean;
      }
    }
    //part 4: special cases
    if (input.privateFor !== undefined) {
      //this doesn't correspond to any of our usual types, so we have to handle it specially
      if (!Array.isArray(input.privateFor)) {
        throw new TypeMismatchError(
          dataType,
          input,
          `${wrapOptions.name}.privateFor`,
          "Transaction option privateFor should be an array of base64-encoded bytestrings of 32 bytes"
        );
      }
      value.privateFor = input.privateFor.map(
        (publicKey: unknown, index: number) => {
          if (typeof publicKey !== "string" && isString(publicKey)) {
            publicKey = publicKey.valueOf();
          }
          if (typeof publicKey !== "string") {
            throw new TypeMismatchError(
              dataType,
              input,
              `${wrapOptions.name}.privateFor`,
              `Public key at index ${index} is not a string`
            );
          }
          if (!publicKey.match(base64Pattern)) {
            throw new TypeMismatchError(
              dataType,
              input,
              `${wrapOptions.name}.privateFor`,
              `Public key at index ${index} is not base64-encoded`
            );
          }
          const length = base64Length(publicKey);
          if (length !== 32) {
            throw new TypeMismatchError(
              dataType,
              input,
              `${wrapOptions.name}.privateFor`,
              `Public key at index ${index} should encode a bytestring of 32 bytes; got ${length} bytes instead`
            );
          }
          return publicKey;
        }
      );
    }
  } else {
    //we don't know what it is
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      "Transaction options input was not a plain object, type/value pair or wrapped options object"
    );
  }
  return {
    type: dataType,
    kind: "value" as const,
    value
  };
}
