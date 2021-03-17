import debugModule from "debug";
const debug = debugModule("codec:wrap:wrap");

import * as Format from "@truffle/codec/format";
import { TypeMismatchError, BadResponseTypeError } from "./errors";
import {
  WrapRequest,
  WrapResponse,
  IntegerWrapRequest,
  DecimalWrapRequest,
  AddressWrapRequest
} from "../types";
import {
  AddressLikeType,
  IntegerOrEnumType,
  DecimalType,
  TupleLikeType,
  AddressLikeValue,
  IntegerOrEnumValue,
  DecimalValue,
  TupleLikeValue,
  WrapOptions,
  Uint8ArrayLikeInput
} from "./types";
import * as Conversion from "@truffle/codec/conversion";
import * as Utils from "./utils";
import * as EvmUtils from "@truffle/codec/evm/utils";
import * as Common from "@truffle/codec/common";
import BN from "bn.js";
import Big from "big.js";
import utf8 from "utf8";
import isBoolean from "lodash.isboolean"; //recognizes boolean *or* Boolean
import isString from "lodash.isstring"; //recognizes string *or* String
import isNumber from "lodash.isnumber"; //recognizes number *or* Number
const Web3Utils = require("web3-utils"); //importing untyped, sorry!

const errorResultMessage =
  "Input is a wrapped result representing an error rather than a value";
const notAStringMessage =
  "Input was not a string, type/value pair, or wrapped or boxed string";
const nonIntegerMessage = "Input numeric value was not an integer";
const nonNumericMessage = "Input string was not numeric";
const badEnumMessage =
  "Input string was neither numeric nor a valid enum value";
const outOfRangeMessage = "Input is outside the range of this numeric type";
const outOfRangeEnumMessage = "Input is outside the range of this enum type";
const checksumFailedMessage =
  "Address checksum failed (use all lowercase or all uppercase to circumvent)";
function wrappedTypeMessage(dataType: Format.Types.Type): string {
  return `Input is a wrapped value of type ${Format.Types.typeString(
    dataType
  )}`;
}
function specifiedTypeMessage(dataType: string): string {
  return `Input had type explicitly specified as ${dataType}`;
}
function overlongMessage(expected: number, got: number): string {
  return `Input is too long for type (expected ${expected} bytes, got ${got} bytes)`;
}
function tooPreciseMessage(expected: number, got: number): string {
  return `Input has too many decimal places for type (expected ${expected} decimal places, got ${got} decimal places)`;
}
function notABytestringMessage(what: string): string {
  return `${what} is not a valid bytestring`;
}
function wrongLengthMessage(
  what: string,
  expected: number,
  got: number
): string {
  return `Input ${what} was ${got} bytes instead of ${expected} bytes`;
}
function wrongArrayLengthMessage(expected: number | BN, got: number): string {
  return `Incorrect array length (expected ${expected.toString()} entries, got ${got})`;
}
const hexStringPattern = /^0x[0-9a-fA-F]*$/;
const shortHexStringPattern = /^[0-9a-fA-F]*$/;
const byteStringPattern = /^0x([0-9a-fA-F]{2})*$/;
const base64Pattern = /([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}([A-Za-z0-9+/]|=)=)?/; //Vim's syntax highlighting is wrong here
function base64Length(base64: string): number {
  const [_, endingEquals] = base64.match(/(=*)$/); //note this match always succeeds
  return (base64.length * 3) / 4 - endingEquals.length;
}

export function* wrap(
  dataType: Format.Types.Type,
  input: any,
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

function wrapBool(
  dataType: Format.Types.BoolType,
  input: any,
  wrapOptions: WrapOptions
): Format.Values.BoolValue {
  let asBoolean: boolean;
  if (typeof input === "boolean") {
    asBoolean = input;
  } else if (typeof input === "number") {
    asBoolean = Boolean(input);
  } else if (typeof input === "string") {
    //strings are true unless they're falsy or the case-insensitive string "false"
    asBoolean = Boolean(input) && input.toLowerCase() !== "false";
  } else if (isBoolean(input)) {
    //if it's a boxed boolean, extract
    //(we do this *after* the primitive boolean check since isBoolean
    //detects both, don't want an infinite loop... this pattern will reoccur
    //throughout all these functions)
    asBoolean = input.valueOf();
  } else if (isString(input)) {
    //just extract & rerun in this case since strings have special handling
    return wrapBool(dataType, input.valueOf(), wrapOptions);
  } else if (isNumber(input)) {
    asBoolean = Boolean(input.valueOf());
  } else if (Utils.isWrappedResult(input)) {
    //1. is it already wrapped?
    if (input.type.typeClass === "bool") {
      switch (input.kind) {
        case "value":
          asBoolean = (<Format.Values.BoolValue>input).value.asBoolean;
          break;
        case "error":
          switch (input.error.kind) {
            case "BoolOutOfRangeError":
            case "BoolPaddingError":
              //treat BoolErrors as true
              asBoolean = true;
              break;
            default:
              throw new TypeMismatchError(
                dataType,
                input,
                wrapOptions.name,
                errorResultMessage
              );
          }
          break;
      }
    } else {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        wrappedTypeMessage(input.type)
      );
    }
  } else if (Utils.isTypeValueInput(input)) {
    //2. is it a type/value?
    if (input.type !== "bool") {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        specifiedTypeMessage(input.type)
      );
    }
    //if so wrap input.value
    return wrapBool(dataType, input.value, { ...wrapOptions, loose: true });
  } else {
    // otherwise, is it truthy or falsy?
    asBoolean = Boolean(input);
  }
  return {
    type: dataType,
    kind: "value" as const,
    value: {
      asBoolean
    }
  };
}

function wrapString(
  dataType: Format.Types.StringType,
  input: any,
  wrapOptions: WrapOptions
): Format.Values.StringValue {
  let asString: string;
  if (Utils.isWrappedResult(input)) {
    //1. is it already wrapped?
    //(rather than dealing with the different kinds in this case
    //for rewrapping, we'll just rewrap directly)
    //yes, this is a little inconsistent with how we handle other cases
    if (input.type.typeClass === "string") {
      switch (input.kind) {
        case "value":
          return {
            type: dataType,
            kind: "value" as const,
            value: (<Format.Values.StringValue>input).value
          };
        case "error":
          throw new TypeMismatchError(
            dataType,
            input,
            wrapOptions.name,
            errorResultMessage
          );
      }
    } else {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        wrappedTypeMessage(input.type)
      );
    }
  } else if (Utils.isTypeValueInput(input)) {
    //2. is it a type/value?
    //if so wrap input.value
    if (input.type !== "string") {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        specifiedTypeMessage(input.type)
      );
    }
    return wrapString(dataType, input.value, { ...wrapOptions, loose: true });
  } else if (typeof input === "string") {
    asString = input;
  } else if (isString(input)) {
    //if it's a boxed string, extract
    asString = input.valueOf();
  } else {
    //we don't know what it is
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      notAStringMessage
    );
  }
  try {
    //check: is this valid UTF-16?
    //(probably not the best way but oh well)
    utf8.encode(asString); //encode but discard :P
  } catch (_) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      "Input string was not valid UTF-16"
    );
  }
  return {
    type: dataType,
    kind: "value" as const,
    value: {
      kind: "valid" as const,
      asString
    }
  };
}

function wrapBytes(
  dataType: Format.Types.BytesType,
  input: any,
  wrapOptions: WrapOptions
): Format.Values.BytesValue {
  let asHex: string;
  if (Utils.isWrappedResult(input)) {
    //1. is it already wrapped?
    if (input.type.typeClass === "bytes") {
      switch (input.kind) {
        case "value":
          if (
            wrapOptions.loose ||
            (input.type.kind === "dynamic" && dataType.kind === "dynamic") ||
            (input.type.kind === "static" &&
              dataType.kind === "static" &&
              input.type.length === dataType.length)
          ) {
            //it's valid! (barring length issues)
            asHex = (<Format.Values.BytesValue>input).value.asHex;
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
    } else {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        wrappedTypeMessage(input.type)
      );
    }
  } else if (Utils.isTypeValueInput(input)) {
    //2. is it a type/value?
    //if so wrap input.value (with loose on so strings will work)
    if (!input.type.match(/^bytes\d*$/)) {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        specifiedTypeMessage(input.type)
      );
    }
    let length: number | null = null;
    let match = input.type.match("^bytes(d+)$");
    if (match) {
      length = Number(match[1]);
    }
    if (
      (length === null && dataType.kind === "dynamic") ||
      (dataType.kind === "static" && length === dataType.length)
    ) {
      //wrap input.value, but with loose on, so strings will be allowed
      return wrapBytes(dataType, input.value, { ...wrapOptions, loose: true });
    } else {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        specifiedTypeMessage(input.type)
      );
    }
  } else if (typeof input === "string") {
    //is it a hex string?
    if (input.match(hexStringPattern)) {
      //reject hex strings that are not byte strings
      if (!input.match(byteStringPattern)) {
        throw new TypeMismatchError(
          dataType,
          input,
          wrapOptions.name,
          "Input was not a valid even-length hex string"
        );
      }
      asHex = input;
      //furthe validation and padding come later
    } else {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        "Input was not a valid even-length hex string"
      );
    }
  } else if (isString(input)) {
    //unbox and retry
    return wrapBytes(dataType, input.valueOf(), wrapOptions);
  } else if (input instanceof Uint8Array) {
    asHex = Conversion.toHexString(input);
  } else if (Utils.isUint8ArrayLikeInput(input)) {
    //note: this has to go *after* isString, as otherwise Strings will be detected here
    checkUint8ArrayLike(input, dataType, wrapOptions.name); //will throw appropriate errors
    asHex = Conversion.toHexString(new Uint8Array(input)); //I am surprised TS accepts this!
  } else if (Utils.isEncodingTextInput(input)) {
    switch(input.encoding) {
      case "utf8":
        asHex = Conversion.toHexString(Conversion.stringToBytes(input.text));
        break;
      default:
        throw new TypeMismatchError(
          dataType,
          input,
          wrapOptions.name,
          `Unknown or unsupported text encoding ${input.encoding}`
        );
    }
  } else {
    //we don't know what it is
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      "Input was not a hex string, byte-array-alike, encoding/text pair, type/value pair, or wrapped bytestring"
    );
  }
  //now: if static length, validate and pad
  if (dataType.kind === "static") {
    if ((asHex.length - 2) / 2 > dataType.length) {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        overlongMessage(dataType.length, (asHex.length - 2) / 2)
      );
    } else {
      asHex = asHex.padEnd(dataType.length * 2 + 2, "00");
    }
  }
  //no idea why TS is messing up here
  return <Format.Values.BytesValue>{
    type: dataType,
    kind: "value" as const,
    value: {
      asHex
    }
  };
}

function* wrapArray(
  dataType: Format.Types.ArrayType,
  input: any,
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

function* wrapIntegerOrEnum(
  dataType: IntegerOrEnumType,
  input: any,
  wrapOptions: WrapOptions
): Generator<IntegerWrapRequest, IntegerOrEnumValue, WrapResponse> {
  let asBN: BN;
  if (typeof input === "number") {
    //numeric case
    if (Number.isSafeInteger(input)) {
      asBN = new BN(input);
    } else {
      if (Number.isInteger(input)) {
        throw new TypeMismatchError(
          dataType,
          input,
          wrapOptions.name,
          "Input number is not a Javascript safe integer"
        );
      } else {
        throw new TypeMismatchError(
          dataType,
          input,
          wrapOptions.name,
          nonIntegerMessage
        );
      }
    }
  } else if (typeof input === "bigint") {
    //bigint case
    asBN = Conversion.toBN(input);
  } else if (isNumber(input)) {
    //we'll just recurse here so we don't need to add another integrality check
    return yield* wrapIntegerOrEnum(dataType, input.valueOf(), wrapOptions);
  } else if (BN.isBN(input)) {
    asBN = input.clone();
  } else if (Conversion.isBig(input)) {
    if (Conversion.countDecimalPlaces(input) === 0) {
      asBN = Conversion.toBN(input);
    } else {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        nonIntegerMessage
      );
    }
  } else if (Utils.isTypeValueInput(input)) {
    if (input.type.match(/^u?int\d*$/)) {
      const [_, typeClass, bitsAsString] = input.type.match(/^(u?int)(\d*)$/);
      const bits = bitsAsString ? Number(bitsAsString) : 256; //defaults to 256
      //(not using the WORD_SIZE constant due to fixed types bringing its applicability
      //here into question)
      if (
        dataType.typeClass === typeClass &&
        (<Format.Types.IntType | Format.Types.UintType>dataType).bits === bits
      ) {
        return yield* wrapIntegerOrEnum(dataType, input.value, {
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
    } else if (input.type === "enum") {
      if (dataType.typeClass === "enum") {
        return yield* wrapIntegerOrEnum(dataType, input.value, {
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
    } else {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        specifiedTypeMessage(input.type)
      );
    }
  } else if (Utils.isWrappedResult(input)) {
    switch (input.type.typeClass) {
      case "int":
      case "uint":
        if (
          !wrapOptions.loose &&
          (input.type.typeClass !== dataType.typeClass ||
            input.type.bits !== dataType.bits)
        ) {
          throw new TypeMismatchError(
            dataType,
            input,
            wrapOptions.name,
            wrappedTypeMessage(input.type)
          );
        }
        switch (input.kind) {
          case "value":
            asBN = (<Format.Values.UintValue | Format.Values.IntValue>(
              input
            )).value.asBN.clone();
            break;
          case "error":
            throw new TypeMismatchError(
              dataType,
              input,
              wrapOptions.name,
              errorResultMessage
            );
        }
        break;
      case "fixed":
      case "ufixed":
        if (!wrapOptions.loose) {
          throw new TypeMismatchError(
            dataType,
            input,
            wrapOptions.name,
            wrappedTypeMessage(input.type)
          );
        }
        switch (input.kind) {
          case "value":
            asBN = Conversion.toBN((<DecimalValue>input).value.asBig);
            break;
          case "error":
            throw new TypeMismatchError(
              dataType,
              input,
              wrapOptions.name,
              errorResultMessage
            );
        }
        break;
      case "enum":
        const coercedInput = <Format.Values.EnumResult>input;
        if (
          !wrapOptions.loose &&
          (dataType.typeClass !== "enum" || input.type.id !== dataType.id)
        ) {
          throw new TypeMismatchError(
            dataType,
            input,
            wrapOptions.name,
            wrappedTypeMessage(input.type)
          );
        }
        switch (coercedInput.kind) {
          case "value":
            asBN = coercedInput.value.numericAsBN.clone();
            break;
          case "error":
            switch (coercedInput.error.kind) {
              case "EnumOutOfRangeError":
                asBN = coercedInput.error.rawAsBN.clone();
                break;
              default:
                throw new TypeMismatchError(
                  dataType,
                  input,
                  wrapOptions.name,
                  errorResultMessage
                );
            }
            break;
        }
        break;
      default:
        throw new TypeMismatchError(
          dataType,
          input,
          wrapOptions.name,
          wrappedTypeMessage(input.type)
        );
    }
  } else if (typeof input === "string") {
    //hoo boy...
    try {
      //first: is it just an integer numeric string that BigInt
      //will accept? [we'll juse BigInt as it accepts more than BN does]
      const asBigInt = BigInt(input);
      asBN = Conversion.toBN(asBigInt);
    } catch {
      //if that didn't work -- might it be a numeric string with a unit?
      //(this case will also handle things that Big will accept but BigInt won't,
      //such as scientific notation, or just non-integers in general)
      let [_, quantityString, unit] = input.match(
        /^(.*?)(|wei|gwei|shannon|finney|szabo|ether)\s*$/i
      ); //units will be case insensitive; note this always matches
      quantityString = quantityString.trim(); //Big rejects whitespace, let's allow it
      const unitPlacesTable: { [unit: string]: number } = {
        //we could accept all of web3's units here, but, that's a little much;
        //we'll just accept the most common ones
        "": 0,
        "wei": 0,
        "gwei": 9,
        "shannon": 9,
        "szabo": 12,
        "finney": 15,
        "ether": 18
      };
      let quantity: Big | null;
      try {
        quantity = quantityString.match(/^\s*$/)
          ? new Big(1) //allow just "ether" e.g.
          : new Big(quantityString);
      } catch {
        quantity = null;
      }
      if (quantity !== null) {
        const places: number = unitPlacesTable[unit.toLowerCase()];
        const asBig = Conversion.shiftBigUp(quantity, places);
        if (Conversion.countDecimalPlaces(asBig) === 0) {
          asBN = Conversion.toBN(asBig);
        } else {
          throw new TypeMismatchError(
            dataType,
            input,
            wrapOptions.name,
            unit !== ""
              ? "Input numeric value was not an integral number of wei"
              : nonIntegerMessage
          );
        }
      } else {
        //if that didn't work -- might it be a negated hex string?
        //(BN & BigInt don't allow that, but ethers does, so we have to handle it somewhat manually)
        if (input.match(/^\s*-/)) {
          let positiveAsBN: BN | null;
          const [_, positiveString] = input.match(/^\s*-(.*)$/);
          try {
            const positive = BigInt(positiveString);
            positiveAsBN = Conversion.toBN(positive);
          } catch {
            positiveAsBN = null;
          }
          if (positiveAsBN === null || positiveString.match(/^(-|\s)/)) {
            //no double negation, and no space after the minus!
            //(we do this as a string check, rather than checking if
            //positiveAsBN is >=0, in order to prevent entering e.g. "--" or "- 2")
            throw new TypeMismatchError(
              dataType,
              input,
              wrapOptions.name,
              nonNumericMessage
            );
          }
          asBN = positiveAsBN.neg();
        } else {
          //finally: if it's not numeric at all.  in this case, we give up for ints & uints,
          //but we still have work to do for enums.
          if (dataType.typeClass !== "enum") {
            throw new TypeMismatchError(
              dataType,
              input,
              wrapOptions.name,
              nonNumericMessage
            );
          }
          const fullType = <Format.Types.EnumType>(
            Format.Types.fullType(dataType, wrapOptions.userDefinedTypes)
          );
          const options = fullType.options;
          const components = input.split(".");
          debug("components: %O", components);
          debug("dataType: %O", dataType);
          debug("options: %O", options);
          //the enum can be qualified.  if it's qualified, does the type match?
          let matchingType: boolean;
          switch (components.length) {
            case 1:
              //not qualified, automatically matches
              matchingType = true;
              break;
            case 2:
              //qualified by type name, does it match?
              matchingType = components[0] === dataType.typeName;
              break;
            case 3:
              //qualified by type name and contract name, does it match?
              matchingType =
                dataType.kind === "local" &&
                components[0] === dataType.definingContractName &&
                components[1] === dataType.typeName;
              break;
            default:
              //no valid reason to have 3 or more periods
              //(and split cannot return an empty array)
              matchingType = false;
          }
          debug("matchingType: %O", matchingType);
          const numeric = matchingType
            ? options.indexOf(components[components.length - 1])
            : -1; //if type doesn't match, just indicate error
          debug("numeric: %d", numeric);
          if (numeric === -1) {
            //-1 comes from either our setting it manually above to indicate error,
            //or from a failed indexOf call
            throw new TypeMismatchError(
              dataType,
              input,
              wrapOptions.name,
              badEnumMessage
            );
          } else {
            asBN = new BN(numeric); //whew!
          }
        }
      }
    }
  } else if (isString(input)) {
    //strings are complicated so let's just recurse
    return yield* wrapIntegerOrEnum(dataType, input.valueOf(), wrapOptions);
  } else if (input instanceof Uint8Array) {
    asBN = Conversion.toBN(input);
  } else if (Utils.isUint8ArrayLikeInput(input)) {
    //note: this has to go *after* isString, as otherwise Strings will be detected here
    //(much like how isString must go after string to prevent infinite loop)
    checkUint8ArrayLike(input, dataType, wrapOptions.name); //will throw appropriate errors
    asBN = Conversion.toBN(new Uint8Array(input)); //I am surprised TS accepts this!
  } else {
    const request = { kind: "integer" as const, input };
    const response = yield request;
    if (response.kind !== "integer") {
      throw new BadResponseTypeError(request, response);
    }
    if (response.value === null) {
      const enumMessage =
        dataType.typeClass === "enum" ? "enum value name, " : "";
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        response.reason ||
          `Input was not a number, big integer, numeric string, ${enumMessage}type/value pair, boxed number, byte-array-like, wrapped number or enum, or recognized big number class`
      );
    }
    asBN = Conversion.toBN(response.value);
  }
  //validate and return
  switch (dataType.typeClass) {
    case "uint":
      if (asBN.isNeg() || asBN.bitLength() > dataType.bits) {
        throw new TypeMismatchError(
          dataType,
          input,
          wrapOptions.name,
          outOfRangeMessage
        );
      }
      return {
        type: dataType,
        kind: "value" as const,
        value: {
          asBN
        }
      };
    case "int":
      if (
        (!asBN.isNeg() && asBN.bitLength() >= dataType.bits) || //>= since signed
        (asBN.isNeg() && asBN.neg().subn(1).bitLength() >= dataType.bits)
        //bitLength doesn't work great for negatives so we do this instead
      ) {
        throw new TypeMismatchError(
          dataType,
          input,
          wrapOptions.name,
          outOfRangeMessage
        );
      }
      return {
        type: dataType,
        kind: "value" as const,
        value: {
          asBN
        }
      };
    case "enum":
      const fullType = <Format.Types.EnumType>(
        Format.Types.fullType(dataType, wrapOptions.userDefinedTypes)
      );
      if (asBN.gten(fullType.options.length)) {
        throw new TypeMismatchError(
          dataType,
          input,
          wrapOptions.name,
          outOfRangeEnumMessage
        );
      } else {
        return {
          type: dataType,
          kind: "value" as const,
          value: {
            numericAsBN: asBN,
            name: fullType.options[asBN.toNumber()]
          }
        };
      }
  }
}

function checkUint8ArrayLike(
  input: Uint8ArrayLikeInput,
  dataType: Format.Types.Type, //for throwing
  name: string //for throwing
): void {
  //this function doesn't return anything, it just throws errors if something
  //goes wrong
  if (!Number.isSafeInteger(input.length)) {
    throw new TypeMismatchError(
      dataType,
      input,
      name,
      "Input is byte-array-like, but its length is not a safe integer"
    );
  }
  if (input.length < 0) {
    throw new TypeMismatchError(
      dataType,
      input,
      name,
      "Input is byte-array-like, but its length is negative"
    );
  }
  //check: is it actually like a Uint8Array?
  for (let index = 0; index < input.length; index++) {
    if (
      typeof input[index] !== "number" ||
      input[index] < 0 ||
      input[index] >= 256 ||
      !Number.isFinite(input[index])
    ) {
      throw new TypeMismatchError(
        dataType,
        input,
        name,
        `Input is byte-array-like, but byte ${index} is not a 1-byte value (number from 0 to 255)`
      );
    }
  }
  //otherwise, we didn't throw any errors, so return
}

function* wrapDecimal(
  dataType: DecimalType,
  input: any,
  wrapOptions: WrapOptions
): Generator<DecimalWrapRequest, DecimalValue, WrapResponse> {
  let asBig: Big;
  let binary: boolean = false;
  if (typeof input === "number") {
    //numeric case
    if (Number.isFinite(input)) {
      asBig = new Big(input);
      binary = true;
    } else {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        "Numeric value is not finite"
      );
    }
  } else if (typeof input === "bigint") {
    //bigint case
    asBig = new Big(input.toString());
  } else if (isNumber(input)) {
    //boxed number case
    return yield* wrapDecimal(dataType, input.valueOf(), wrapOptions);
  } else if (BN.isBN(input)) {
    asBig = Conversion.toBig(input);
  } else if (Conversion.isBig(input)) {
    asBig = input.plus(0); //clone
  } else if (Utils.isTypeValueInput(input)) {
    if (input.type.match(/^u?fixed(\d+(x\d+)?)?$/)) {
      const [
        _0,
        typeClass,
        _2,
        bitsAsString,
        _4,
        placesAsString
      ] = input.type.match(/^(u?fixed)((\d+)(x(\d+))?)?$/);
      //not all of the fields in this match are used, so we discard them into _n variables
      const bits = bitsAsString ? Number(bitsAsString) : 128; //defaults to 128
      const places = placesAsString ? Number(placesAsString) : 18; //defaults to 18
      if (
        dataType.typeClass === typeClass &&
        (<DecimalType>dataType).bits === bits &&
        (<DecimalType>dataType).places === places
      ) {
        return yield* wrapDecimal(dataType, input.value, {
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
    } else {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        specifiedTypeMessage(input.type)
      );
    }
  } else if (Utils.isWrappedResult(input)) {
    switch (input.type.typeClass) {
      case "fixed":
      case "ufixed":
        if (
          !wrapOptions.loose &&
          (input.type.typeClass !== dataType.typeClass ||
            input.type.bits !== dataType.bits ||
            input.type.places !== dataType.places)
        ) {
          throw new TypeMismatchError(
            dataType,
            input,
            wrapOptions.name,
            wrappedTypeMessage(input.type)
          );
        }
        switch (input.kind) {
          case "value":
            asBig = (<DecimalValue>input).value.asBig.plus(0); //clone
            break;
          case "error":
            throw new TypeMismatchError(
              dataType,
              input,
              wrapOptions.name,
              errorResultMessage
            );
        }
        break;
      case "int":
      case "uint":
        if (!wrapOptions.loose) {
          throw new TypeMismatchError(
            dataType,
            input,
            wrapOptions.name,
            wrappedTypeMessage(input.type)
          );
        }
        switch (input.kind) {
          case "value":
            asBig = Conversion.toBig(
              (<Format.Values.UintValue | Format.Values.IntValue>input).value
                .asBN
            );
            break;
          case "error":
            throw new TypeMismatchError(
              dataType,
              input,
              wrapOptions.name,
              errorResultMessage
            );
        }
        break;
      case "enum":
        const coercedInput = <Format.Values.EnumResult>input;
        if (!wrapOptions.loose) {
          throw new TypeMismatchError(
            dataType,
            input,
            wrapOptions.name,
            wrappedTypeMessage(input.type)
          );
        }
        switch (coercedInput.kind) {
          case "value":
            asBig = Conversion.toBig(coercedInput.value.numericAsBN);
            break;
          case "error":
            switch (coercedInput.error.kind) {
              case "EnumOutOfRangeError":
                asBig = Conversion.toBig(coercedInput.error.rawAsBN);
                break;
              default:
                throw new TypeMismatchError(
                  dataType,
                  input,
                  wrapOptions.name,
                  errorResultMessage
                );
            }
            break;
        }
        break;
      default:
        throw new TypeMismatchError(
          dataType,
          input,
          wrapOptions.name,
          wrappedTypeMessage(input.type)
        );
    }
  } else if (typeof input === "string") {
    //so much simpler than the integer case!
    const trimmed = input.trim(); //allow whitespace
    try {
      asBig = new Big(trimmed);
    } catch {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        nonNumericMessage
      );
    }
  } else if (isString(input)) {
    //we'll just recurse here for proper string handling
    return yield* wrapDecimal(dataType, input.valueOf(), wrapOptions);
  } else {
    const request = { kind: "decimal" as const, input };
    const response = yield request;
    if (response.kind !== "decimal") {
      throw new BadResponseTypeError(request, response);
    }
    if (response.value === null) {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        response.reason ||
          `Input was not a number, big integer, numeric string, type/value pair, boxed number, wrapped number or enum, or recognized big number class`
      );
    }
    asBig = response.value.plus(0); //clone
  }
  //validate and return
  if (Conversion.countDecimalPlaces(asBig) > dataType.places) {
    if (!binary || !wrapOptions.loose) {
      //we only allow rounding for binary input, not decimal input
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        tooPreciseMessage(dataType.places, Conversion.countDecimalPlaces(asBig))
      );
    } else {
      asBig = asBig.round(dataType.places, 2); //the constant 2 here is the rounding mode ROUND_HALF_EVEN
    }
  }
  if (
    asBig.gt(Utils.maxValue(dataType)) ||
    asBig.lt(Utils.minValue(dataType))
  ) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      outOfRangeMessage
    );
  }
  //no idea why TS is messing up here
  return <DecimalValue>{
    type: dataType,
    kind: "value" as const,
    value: {
      asBig
    }
  };
}

//handles both address and contracts
//NOTE: even with loose turned off, we'll consider these interchangeable
function* wrapAddress(
  dataType: AddressLikeType,
  input: any,
  wrapOptions: WrapOptions
): Generator<AddressWrapRequest, AddressLikeValue, WrapResponse> {
  let asAddress: string;
  if (Utils.isWrappedResult(input)) {
    //1. is it already wrapped?
    switch (input.kind) {
      case "value":
        switch (input.type.typeClass) {
          case "address":
            asAddress = (<Format.Values.AddressValue>input).value.asAddress;
            break;
          case "contract":
            asAddress = (<Format.Values.ContractValue>input).value.address;
            break;
          default:
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
    //if so wrap input.value (with loose on so strings will work)
    if (input.type !== "address" && input.type !== "contract") {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        specifiedTypeMessage(input.type)
      );
    }
    return yield* wrapAddress(dataType, input.value, {
      ...wrapOptions,
      loose: true
    });
  } else if (typeof input === "string") {
    if (input.match(hexStringPattern)) {
      //case 1: it's a hex string
      asAddress = input; //validation will be handled below
    } else if (input.match(shortHexStringPattern)) {
      //doing this because ethers does it
      asAddress = "0x" + input;
    } else {
      //case 2: it needs resolution
      //(this will handle ICAP addresses as well)
      const request = { kind: "address" as const, name: input };
      const response = yield request;
      if (response.kind !== "address") {
        throw new BadResponseTypeError(request, response);
      }
      if (response.address === null) {
        throw new TypeMismatchError(
          dataType,
          input,
          wrapOptions.name,
          response.reason
        );
      }
      asAddress = response.address;
    }
  } else if (isString(input)) {
    //unbox and retry
    return yield* wrapAddress(dataType, input.valueOf(), wrapOptions);
  } else if (Utils.isContractInput(input)) {
    asAddress = input.address;
  } else {
    //we don't know what it is
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      "Input was not recognizable as an address"
    );
  }
  //now: validate
  if (!asAddress.match(byteStringPattern)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      notABytestringMessage("Address")
    );
  }
  if (asAddress.length !== 2 * EvmUtils.ADDRESS_SIZE + 2) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      wrongLengthMessage(
        "address",
        EvmUtils.ADDRESS_SIZE,
        (asAddress.length - 2) / 2
      )
    );
  }
  if (!Web3Utils.isAddress(asAddress)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      checksumFailedMessage
    );
  }
  //and normalize
  asAddress = Web3Utils.toChecksumAddress(asAddress);
  switch (dataType.typeClass) {
    case "address":
      return {
        type: dataType,
        kind: "value" as const,
        value: {
          asAddress
        }
      };
    case "contract":
      return {
        type: dataType,
        kind: "value" as const,
        value: {
          kind: "unknown" as const,
          address: asAddress
        }
      };
  }
}

//even with loose turned off, we won't distinguish
//between tuples and structs
function* wrapTuple(
  dataType: TupleLikeType,
  input: any,
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
  } else if (typeof input === "object" && input !== null) {
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
  input: any,
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
    selector = "0x" + input.slice(EvmUtils.ADDRESS_SIZE * 2 + 2);
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
  input: any,
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
  } else if (typeof input === "object" && input !== null) {
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
        (publicKey: any, index: number) => {
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
