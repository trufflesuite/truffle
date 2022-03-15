import debugModule from "debug";
const debug = debugModule("codec:wrap:integer");

import * as Format from "@truffle/codec/format";
import { wrapWithCases } from "./dispatch";
import { TypeMismatchError, BadResponseTypeError } from "./errors";
import type { WrapResponse, IntegerWrapRequest } from "../types";
import type {
  Case,
  IntegerOrEnumType,
  IntegerOrEnumValue,
  DecimalValue,
  IntegerValue,
  WrapOptions
} from "./types";
import * as Conversion from "@truffle/codec/conversion";
import * as Utils from "./utils";
import * as Messages from "./messages";
import BN from "bn.js";
import Big from "big.js";

import { validateUint8ArrayLike } from "./bytes";

//NOTE: all cases called "integerFrom..." also work for enums.
//The cases labeled "enumFrom..." work only for enums.
//there are no cases that work only for integers and not enums,
//because we always want input for integers to also be valid for enums.

const integerFromStringCases: Case<
  IntegerOrEnumType,
  IntegerOrEnumValue,
  never
>[] = [
  integerFromIntegerString,
  enumFromNameString,
  integerFromScientificOrUnits, //NOTE: please put this after the integer string case
  integerFromNegatedBaseString, //NOTE: please put this after the other numeric string cases
  integerFromStringFailureCase
];

//note: doesn't include UDVT case,
//or error case
const integerFromWrappedValueCases: Case<
  IntegerOrEnumType,
  IntegerOrEnumValue,
  never
>[] = [
  integerFromCodecIntegerValue,
  integerFromCodecEnumValue,
  integerFromCodecDecimalValue
];

const integerCasesBasic: Case<
  IntegerOrEnumType,
  IntegerOrEnumValue,
  IntegerWrapRequest
>[] = [
  ...integerFromStringCases,
  integerFromNumber,
  integerFromBoxedNumber,
  integerFromBoxedString,
  integerFromBigint,
  integerFromBN,
  integerFromBig,
  integerFromUint8ArrayLike,
  ...integerFromWrappedValueCases,
  integerFromCodecEnumError,
  integerFromCodecUdvtValue,
  integerFromOther //must go last!
];

export const integerCases: Case<
  IntegerOrEnumType,
  IntegerOrEnumValue,
  IntegerWrapRequest
>[] = [
  integerFromIntegerTypeValueInput,
  enumFromEnumTypeValueInput,
  ...integerCasesBasic
];

function* integerFromIntegerString(
  dataType: IntegerOrEnumType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, IntegerOrEnumValue, WrapResponse> {
  if (typeof input !== "string") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a string"
    );
  }
  if (input.trim() === "") {
    //bigint accepts this but we shouldn't
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      dataType.typeClass === "enum"
        ? Messages.badEnumMessage
        : Messages.nonNumericMessage
    );
  }
  const stripped = Utils.removeUnderscoresNumeric(input);
  let asBN: BN;
  try {
    //we'll use BigInt to parse integer strings, as it's pretty good at it.
    //Note that it accepts hex/octal/binary with prefixes 0x, 0o, 0b.
    const asBigInt = BigInt(stripped);
    asBN = Conversion.toBN(asBigInt);
  } catch {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input string was not an integer string"
    );
  }
  return validateAndWrap(dataType, asBN, wrapOptions, input);
}

//this case handles both scientific notation, and numbers with units
function* integerFromScientificOrUnits(
  dataType: IntegerOrEnumType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, IntegerOrEnumValue, WrapResponse> {
  if (typeof input !== "string") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a string"
    );
  }
  if (input.trim() === "") {
    //the code below accepts this but we shouldn't
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1, //only specificity 1 since it's already specificity 5 above
      dataType.typeClass === "enum"
        ? Messages.badEnumMessage
        : Messages.nonNumericMessage
    );
  }
  const stripped = Utils.removeUnderscoresNoHex(input);
  let [_, quantityString, unit] = stripped.match(
    /^(.*?)(|wei|gwei|shannon|finney|szabo|ether)\s*$/i
  ); //units will be case insensitive; note this always matches
  quantityString = quantityString.trim(); //Big rejects whitespace, let's allow it
  const unitPlacesTable: { [unit: string]: number } = {
    //we could accept all of web3's units here, but, that's a little much;
    //we'll just accept the most common ones
    "": 0,
    wei: 0,
    gwei: 9,
    shannon: 9,
    szabo: 12,
    finney: 15,
    ether: 18
  };
  let quantity: Big | null;
  try {
    quantity = quantityString.match(/^\s*$/)
      ? new Big(1) //allow just "ether" e.g.
      : new Big(quantityString);
  } catch {
    quantity = null;
  }
  if (quantity === null) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a string using scientific notation or units"
    );
  }
  const places: number = unitPlacesTable[unit.toLowerCase()];
  const asBig = Conversion.shiftBigUp(quantity, places);
  if (Conversion.countDecimalPlaces(asBig) !== 0) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      unit !== ""
        ? "Input numeric value was not an integral number of wei"
        : Messages.nonIntegerMessage
    );
  }
  const asBN = Conversion.toBN(asBig);
  return validateAndWrap(dataType, asBN, wrapOptions, input);
}

function* integerFromNegatedBaseString(
  dataType: IntegerOrEnumType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, IntegerOrEnumValue, WrapResponse> {
  if (typeof input !== "string") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a string"
    );
  }
  if (!input.match(/^\s*-/)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a negated numeric string"
    );
  }
  const stripped = Utils.removeUnderscoresNumeric(input);
  let positiveAsBN: BN | null;
  const [_, positiveString] = stripped.match(/^\s*-(.*)$/);
  try {
    const positive = BigInt(positiveString);
    positiveAsBN = Conversion.toBN(positive);
  } catch {
    positiveAsBN = null;
  }
  if (
    positiveAsBN === null ||
    positiveString === "" ||
    positiveString.match(/^(-|\s)/)
  ) {
    //no double negation, no bare "-", and no space after the minus!
    //(we do this as a string check, rather than checking if
    //positiveAsBN is >=0, in order to prevent entering e.g. "--" or "- 2")
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      Messages.nonNumericMessage
    );
  }
  const asBN = positiveAsBN.neg();
  return validateAndWrap(dataType, asBN, wrapOptions, input);
}

function* enumFromNameString(
  dataType: IntegerOrEnumType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, Format.Values.EnumValue, WrapResponse> {
  if (typeof input !== "string") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a string"
    );
  }
  if (dataType.typeClass !== "enum") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      Messages.nonNumericMessage
    );
  }
  const fullType = <Format.Types.EnumType>(
    Format.Types.fullType(dataType, wrapOptions.userDefinedTypes)
  );
  const options = fullType.options;
  const components = input.split(".");
  const finalComponent = components[components.length - 1];
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
  const numeric = matchingType ? options.indexOf(finalComponent) : -1; //if type doesn't match, just indicate error
  debug("numeric: %d", numeric);
  if (numeric === -1) {
    //-1 comes from either our setting it manually above to indicate error,
    //or from a failed indexOf call
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      Messages.badEnumMessage
    );
  }
  const asBN = new BN(numeric); //whew!
  //now: unlike in every other case, we can skip validation!
  //so let's just wrap and return!
  return {
    type: dataType,
    kind: "value" as const,
    value: {
      numericAsBN: asBN,
      name: finalComponent //we know it matches!
    }
  };
}

function* integerFromStringFailureCase(
  dataType: IntegerOrEnumType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, never, WrapResponse> {
  if (typeof input !== "string") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a string"
    );
  }
  throw new TypeMismatchError(
    dataType,
    input,
    wrapOptions.name,
    4,
    dataType.typeClass === "enum"
      ? Messages.badEnumMessage
      : Messages.nonNumericMessage
  );
}

function* integerFromBN(
  dataType: IntegerOrEnumType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, IntegerOrEnumValue, WrapResponse> {
  if (!BN.isBN(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a BN"
    );
  }
  const asBN = input.clone();
  return validateAndWrap(dataType, asBN, wrapOptions, input);
}

function* integerFromBigint(
  dataType: IntegerOrEnumType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, IntegerOrEnumValue, WrapResponse> {
  if (typeof input !== "bigint") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a bigint"
    );
  }
  const asBN = Conversion.toBN(input);
  return validateAndWrap(dataType, asBN, wrapOptions, input);
}

function* integerFromNumber(
  dataType: IntegerOrEnumType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, IntegerOrEnumValue, WrapResponse> {
  if (typeof input !== "number") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a number"
    );
  }
  if (!Number.isInteger(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.nonIntegerMessage
    );
  }
  if (!Number.isSafeInteger(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.nonSafeMessage
    );
  }
  const asBN = new BN(input);
  return validateAndWrap(dataType, asBN, wrapOptions, input);
}

function* integerFromBig(
  dataType: IntegerOrEnumType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, IntegerOrEnumValue, WrapResponse> {
  if (!Conversion.isBig(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a Big"
    );
  }
  if (Conversion.countDecimalPlaces(input) !== 0) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.nonIntegerMessage
    );
  }
  const asBN = Conversion.toBN(input);
  return validateAndWrap(dataType, asBN, wrapOptions, input);
}

function* integerFromUint8ArrayLike(
  dataType: IntegerOrEnumType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, IntegerOrEnumValue, WrapResponse> {
  if (!Utils.isUint8ArrayLike(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a Uint8Array-like"
    );
  }
  //the next series of checks is delegated to a helper fn
  validateUint8ArrayLike(input, dataType, wrapOptions.name); //(this fn just throws an appropriate error if something's bad)
  const asBN = Conversion.toBN(new Uint8Array(input)); //I am surprised TS accepts this!
  return validateAndWrap(dataType, asBN, wrapOptions, input);
}

function* integerFromBoxedNumber(
  dataType: IntegerOrEnumType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, IntegerOrEnumValue, WrapResponse> {
  if (!Utils.isBoxedNumber(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a boxed number"
    );
  }
  //unbox and try again
  return yield* integerFromNumber(dataType, input.valueOf(), wrapOptions);
}

function* integerFromBoxedString(
  dataType: IntegerOrEnumType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, IntegerOrEnumValue, WrapResponse> {
  if (!Utils.isBoxedString(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a boxed string"
    );
  }
  //unbox and try again
  return yield* wrapWithCases(
    dataType,
    input.valueOf(),
    wrapOptions,
    integerFromStringCases
  );
}

function* integerFromCodecIntegerValue(
  dataType: IntegerOrEnumType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, IntegerOrEnumValue, WrapResponse> {
  if (!Utils.isWrappedResult(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a wrapped result"
    );
  }
  if (input.type.typeClass !== "int" && input.type.typeClass !== "uint") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.wrappedTypeMessage(input.type)
    );
  }
  if (input.kind !== "value") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.errorResultMessage
    );
  }
  if (
    !wrapOptions.loose &&
    (input.type.typeClass !== dataType.typeClass ||
      input.type.bits !== dataType.bits)
  ) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.wrappedTypeMessage(input.type)
    );
  }
  const asBN = (<IntegerValue>input).value.asBN.clone();
  return validateAndWrap(dataType, asBN, wrapOptions, input);
}

function* integerFromCodecDecimalValue(
  dataType: IntegerOrEnumType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, IntegerOrEnumValue, WrapResponse> {
  if (!Utils.isWrappedResult(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a wrapped result"
    );
  }
  if (input.type.typeClass !== "fixed" && input.type.typeClass !== "ufixed") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.wrappedTypeMessage(input.type)
    );
  }
  if (input.kind !== "value") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.errorResultMessage
    );
  }
  if (!wrapOptions.loose) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.wrappedTypeMessage(input.type)
    );
  }
  const asBN = Conversion.toBN((<DecimalValue>input).value.asBig);
  return validateAndWrap(dataType, asBN, wrapOptions, input);
}

function* integerFromCodecEnumValue(
  dataType: IntegerOrEnumType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, IntegerOrEnumValue, WrapResponse> {
  if (!Utils.isWrappedResult(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a wrapped result"
    );
  }
  if (input.type.typeClass !== "enum") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.wrappedTypeMessage(input.type)
    );
  }
  if (input.kind !== "value") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1, //only specificity 1 due to EnumError case
      Messages.errorResultMessage
    );
  }
  if (
    !wrapOptions.loose &&
    (dataType.typeClass !== "enum" || input.type.id !== dataType.id)
  ) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.wrappedTypeMessage(input.type)
    );
  }
  const asBN = (<Format.Values.EnumValue>input).value.numericAsBN.clone();
  return validateAndWrap(dataType, asBN, wrapOptions, input);
}

function* integerFromCodecEnumError(
  dataType: IntegerOrEnumType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, IntegerOrEnumValue, WrapResponse> {
  if (!Utils.isWrappedResult(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a wrapped result"
    );
  }
  if (input.type.typeClass !== "enum") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.wrappedTypeMessage(input.type)
    );
  }
  if (input.kind !== "error") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Wrapped result was a value rather than an error"
    );
  }
  if (
    !wrapOptions.loose &&
    (dataType.typeClass !== "enum" || input.type.id !== dataType.id)
  ) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.wrappedTypeMessage(input.type)
    );
  }
  const coercedInput = <Format.Errors.EnumErrorResult>input;
  //only one specific kind of error will be allowed
  if (coercedInput.error.kind !== "EnumOutOfRangeError") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.errorResultMessage
    );
  }
  const asBN = coercedInput.error.rawAsBN.clone();
  return validateAndWrap(dataType, asBN, wrapOptions, input);
}

function* integerFromCodecUdvtValue(
  dataType: IntegerOrEnumType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, IntegerOrEnumValue, WrapResponse> {
  if (!Utils.isWrappedResult(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a wrapped result"
    );
  }
  if (input.type.typeClass !== "userDefinedValueType") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      Messages.wrappedTypeMessage(input.type)
    );
  }
  if (input.kind !== "value") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.errorResultMessage
    );
  }
  return yield* wrapWithCases(
    dataType,
    input.value,
    wrapOptions,
    integerFromWrappedValueCases
  );
}

function* integerFromIntegerTypeValueInput(
  dataType: IntegerOrEnumType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<IntegerWrapRequest, IntegerOrEnumValue, WrapResponse> {
  if (!Utils.isTypeValueInput(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a type/value pair"
    );
  }
  if (!input.type.match(/^u?int\d*$/)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      dataType.typeClass === "enum" ? 1 : 5,
      //use specificity 5 when getting an integer (which have no alternative),
      //but specificity 1 when getting an enum (which have enum type/value input also)
      Messages.specifiedTypeMessage(input.type)
    );
  }
  const [_, typeClass, bitsAsString] = input.type.match(/^(u?int)(\d*)$/);
  const bits = bitsAsString ? Number(bitsAsString) : 256; //defaults to 256
  //(not using the WORD_SIZE constant due to fixed types bringing its applicability
  //here into question)
  const requiredTypeClass =
    dataType.typeClass !== "enum" ? dataType.typeClass : "uint"; //allow underlying uint type to work for enums
  //(we handle "enum" given as type in a separate case below)
  const requiredBits =
    dataType.typeClass !== "enum"
      ? dataType.bits
      : 8 *
        Math.ceil(
          Math.log2(
            (<Format.Types.EnumType>(
              Format.Types.fullType(dataType, wrapOptions.userDefinedTypes)
            )).options.length
          ) / 8
        ); //compute required bits for enum type (sorry)
  if (requiredTypeClass !== typeClass || requiredBits !== bits) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.specifiedTypeMessage(input.type)
    );
  }
  //extract value & try again, with loose option turned on
  return yield* wrapWithCases(
    dataType,
    input.value,
    { ...wrapOptions, loose: true },
    integerCasesBasic
  );
}

function* enumFromEnumTypeValueInput(
  dataType: IntegerOrEnumType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<IntegerWrapRequest, Format.Values.EnumValue, WrapResponse> {
  if (!Utils.isTypeValueInput(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a type/value pair"
    );
  }
  if (input.type !== "enum") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      dataType.typeClass === "enum" ? 5 : 1,
      //use specificity 5 when getting an enum (which will have also failed integer type/value input),
      //but specificity 1 when getting an integer (to which this doesn't really apply)
      Messages.specifiedTypeMessage(input.type)
    );
  }
  if (dataType.typeClass !== "enum") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.specifiedTypeMessage(input.type)
    );
  }
  //extract value & try again, with loose option turned on
  //(we'll also coerce the type on this one since we know it's
  //going to be an enum value :P )
  return <Format.Values.EnumValue>(
    yield* wrapWithCases(
      dataType,
      input.value,
      { ...wrapOptions, loose: true },
      integerCasesBasic
    )
  );
}

function* integerFromOther(
  dataType: IntegerOrEnumType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<IntegerWrapRequest, IntegerOrEnumValue, WrapResponse> {
  const request = { kind: "integer" as const, input };
  const response = yield request;
  if (response.kind !== "integer") {
    throw new BadResponseTypeError(request, response);
  }
  if (response.value === null) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      response.partiallyRecognized ? 5 : 3,
      response.reason || Messages.unrecognizedNumberMessage(dataType)
    );
  }
  const asBN = Conversion.toBN(response.value);
  return validateAndWrap(dataType, asBN, wrapOptions, input);
}

function validateAndWrap(
  dataType: IntegerOrEnumType,
  asBN: BN,
  wrapOptions: WrapOptions,
  input: unknown //just for erroring
): IntegerOrEnumValue {
  switch (dataType.typeClass) {
    case "uint":
      if (asBN.isNeg() || asBN.bitLength() > dataType.bits) {
        throw new TypeMismatchError(
          dataType,
          input,
          wrapOptions.name,
          5,
          Messages.outOfRangeMessage
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
          5,
          Messages.outOfRangeMessage
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
      if (asBN.isNeg() || asBN.gten(fullType.options.length)) {
        throw new TypeMismatchError(
          dataType,
          input,
          wrapOptions.name,
          5,
          Messages.outOfRangeEnumMessage
        );
      }
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
