import debugModule from "debug";
const debug = debugModule("codec:wrap:wrap");

import * as Format from "@truffle/codec/format";
import { TypeMismatchError } from "./errors";
import type { WrapRequest, WrapResponse } from "../types";
import type { Case, TupleLikeType, TupleLikeValue, WrapOptions } from "./types";
import { wrapWithCases } from "./dispatch";
import * as Messages from "./messages";
import * as Conversion from "@truffle/codec/conversion";
import * as Utils from "./utils";
import type { Options } from "@truffle/codec/common";

import { integerCases } from "./integer";
import { decimalCases } from "./decimal";
import { boolCases } from "./bool";
import { bytesCases } from "./bytes";
import { addressCases } from "./address";
import { stringCases } from "./string";
import { functionExternalCases } from "./function";

//this file contains the main wrap function, as well as the cases
//for arrays, tuples, udvts, and tx options.  all other types get their
//own file.

const arrayCasesBasic: Case<
  Format.Types.ArrayType,
  Format.Values.ArrayValue,
  WrapRequest
>[] = [arrayFromArray, arrayFromCodecArrayValue, arrayFailureCase];

export const arrayCases: Case<
  Format.Types.ArrayType,
  Format.Values.ArrayValue,
  WrapRequest
>[] = [arrayFromTypeValueInput, ...arrayCasesBasic];

const tupleCasesBasic: Case<TupleLikeType, TupleLikeValue, WrapRequest>[] = [
  tupleFromArray,
  tupleFromCodecTupleLikeValue,
  tupleFromObject,
  tupleFailureCase
];

export const tupleCases: Case<TupleLikeType, TupleLikeValue, WrapRequest>[] = [
  tupleFromTypeValueInput,
  ...tupleCasesBasic
];

const txOptionsCasesBasic: Case<
  Format.Types.OptionsType,
  Format.Values.OptionsValue,
  WrapRequest
>[] = [optionsFromCodecOptionsValue, optionsFromObject, optionsFailureCase];

export const txOptionsCases: Case<
  Format.Types.OptionsType,
  Format.Values.OptionsValue,
  WrapRequest
>[] = [optionsFromTypeValueInput, ...txOptionsCasesBasic];

export const udvtCases: Case<
  Format.Types.UserDefinedValueTypeType,
  Format.Values.UserDefinedValueTypeValue,
  WrapRequest
>[] = [
  //no separate case for udvtFromUdvtValue,
  //since underlying already handles this
  udvtFromUnderlying
];

export function* wrap(
  dataType: Format.Types.Type,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<WrapRequest, Format.Values.Value, WrapResponse> {
  if (!wrapOptions.name) {
    wrapOptions = { ...wrapOptions, name: "<input>" };
  }
  switch (dataType.typeClass) {
    case "uint":
    case "int":
    case "enum":
      return yield* wrapWithCases(dataType, input, wrapOptions, integerCases);
    case "fixed":
    case "ufixed":
      return yield* wrapWithCases(dataType, input, wrapOptions, decimalCases);
    case "bool":
      return yield* wrapWithCases(dataType, input, wrapOptions, boolCases);
    case "bytes":
      return yield* wrapWithCases(dataType, input, wrapOptions, bytesCases);
    case "address":
    case "contract":
      //these are treated the same
      return yield* wrapWithCases(dataType, input, wrapOptions, addressCases);
    case "string":
      return yield* wrapWithCases(dataType, input, wrapOptions, stringCases);
    case "function":
      //special check: weed out internal functions
      if (dataType.visibility === "internal") {
        throw new TypeMismatchError(
          dataType,
          input,
          wrapOptions.name,
          5, //it doesn't matter, but we'll make this error high specificity
          `Wrapping/encoding for internal function pointers is not supported`
        );
      }
      //otherwise, go ahead
      return yield* wrapWithCases(
        dataType,
        input,
        wrapOptions,
        functionExternalCases
      );
    case "array":
      return yield* wrapWithCases(dataType, input, wrapOptions, arrayCases);
    case "struct":
    case "tuple":
      //these are treated the same as well
      return yield* wrapWithCases(dataType, input, wrapOptions, tupleCases);
    case "userDefinedValueType":
      return yield* wrapWithCases(dataType, input, wrapOptions, udvtCases);
    case "options":
      return yield* wrapWithCases(dataType, input, wrapOptions, txOptionsCases);
    default:
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        5, //it doesn't matter, but we'll make this error high specificity
        `Wrapping/encoding for type ${Format.Types.typeStringWithoutLocation(
          dataType
        )} is not supported`
      );
  }
}

//array cases

function* arrayFromArray(
  dataType: Format.Types.ArrayType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<WrapRequest, Format.Values.ArrayValue, WrapResponse> {
  if (!Array.isArray(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not an array"
    );
  }
  if (dataType.kind === "static" && !dataType.length.eqn(input.length)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.wrongArrayLengthMessage(dataType.length, input.length)
    );
  }
  //can't do yield in a map, so manual loop here
  let value: Format.Values.Value[] = [];
  for (let index = 0; index < input.length; index++) {
    value.push(
      yield* wrap(dataType.baseType, input[index], {
        ...wrapOptions,
        name: `${wrapOptions.name}[${index}]`, //set new name for components
        specificityFloor: 5 //errors in components are quite specific!
      })
    );
  }
  return {
    type: dataType,
    kind: "value" as const,
    value
  };
}

function* arrayFromCodecArrayValue(
  dataType: Format.Types.ArrayType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<WrapRequest, Format.Values.ArrayValue, WrapResponse> {
  if (!Utils.isWrappedResult(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a wrapped result"
    );
  }
  if (input.type.typeClass !== "array") {
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
  //we won't bother with detailed typechecking as much of it is handled
  //either in the call to arrayFromArray or in the wrapping of the
  //individual elements; we will check dynamic vs static though as that
  //isn't handled elsewhere
  if (!wrapOptions.loose && input.type.kind === dataType.kind) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.wrappedTypeMessage(input.type)
    );
  }
  //note that we do *not* just copy over input.value, but rather we
  //defer to arrayFromArray; this is because there might be some elements
  //where the type is not the same but is compatible
  const value = (<Format.Values.ArrayValue>input).value;
  return yield* arrayFromArray(dataType, value, wrapOptions);
}

function* arrayFromTypeValueInput(
  dataType: Format.Types.ArrayType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<WrapRequest, Format.Values.ArrayValue, WrapResponse> {
  if (!Utils.isTypeValueInput(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a type/value pair"
    );
  }
  if (input.type !== "array") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.specifiedTypeMessage(input.type)
    );
  }
  //don't turn on loose here, only do that for non-container types!
  return yield* wrapWithCases(
    dataType,
    input.value,
    wrapOptions,
    arrayCasesBasic
  );
}

function* arrayFailureCase(
  dataType: Format.Types.ArrayType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, never, WrapResponse> {
  throw new TypeMismatchError(
    dataType,
    input,
    wrapOptions.name,
    2,
    "Input was not an array, type/value pair or wrapped array"
  );
}

//tuple/struct cases;
//note even with loose turned off, we won't distinguish
//between tuples and structs

function* tupleFromArray(
  dataType: TupleLikeType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<WrapRequest, TupleLikeValue, WrapResponse> {
  //first: obtain the types of the members
  if (!Array.isArray(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not an array"
    );
  }
  debug("input is array");
  const memberTypes = memberTypesForType(
    dataType,
    wrapOptions.userDefinedTypes
  );
  if (memberTypes.length !== input.length) {
    debug("input is wrong-length array");
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.wrongArrayLengthMessage(memberTypes.length, input.length)
    );
  }
  //can't do yield in a map, so manual loop here
  let value: Format.Values.OptionallyNamedValue[] = [];
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
          : `${wrapOptions.name}[${index}]`,
        specificityFloor: 5
      })
    });
  }
  //we need to coerce here because TS doesn't know that if it's a struct
  //then everything has a name
  return <TupleLikeValue>{
    type: dataType,
    kind: "value" as const,
    value
  };
}

function* tupleFromObject(
  dataType: TupleLikeType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<WrapRequest, TupleLikeValue, WrapResponse> {
  if (!Utils.isPlainObject(input)) {
    //just checks that it's an object & not null
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a non-null object"
    );
  }
  if (!wrapOptions.loose && Utils.isTypeValueInput(input)) {
    //let's exclude these unless loose is turned on
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was a type/value pair"
    );
  }
  if (!wrapOptions.loose && Utils.isWrappedResult(input)) {
    //similarly here
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was a wrapped result"
    );
  }
  const memberTypes = memberTypesForType(
    dataType,
    wrapOptions.userDefinedTypes
  );
  if (memberTypes.some(({ name }) => !name)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      4,
      "Plain object input is allowed only when all elements of tuple are named"
    );
  }
  let unusedKeys = new Set(Object.keys(input));
  let value: Format.Values.OptionallyNamedValue[] = [];
  for (let index = 0; index < memberTypes.length; index++) {
    //note we had better process these in order!
    const memberName = memberTypes[index].name;
    if (!(memberName in input)) {
      throw new TypeMismatchError(
        dataType,
        input,
        wrapOptions.name,
        4,
        `Missing key from tuple or struct: ${memberName}`
      );
    }
    unusedKeys.delete(memberName);
    value.push({
      name: memberName,
      value: yield* wrap(memberTypes[index].type, input[memberName], {
        ...wrapOptions,
        name: `${wrapOptions.name}.${memberName}`,
        specificityFloor: 4 //not sure this warrants a 5
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
        4,
        `Unknown key ${exampleKey} included`
      );
    }
  }
  //we need to coerce here because TS doesn't know that if it's a struct
  //then everything has a name
  return <TupleLikeValue>{
    type: dataType,
    kind: "value" as const,
    value
  };
}

function* tupleFromCodecTupleLikeValue(
  dataType: TupleLikeType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<WrapRequest, TupleLikeValue, WrapResponse> {
  if (!Utils.isWrappedResult(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a wrapped result"
    );
  }
  if (input.type.typeClass !== "tuple" && input.type.typeClass !== "struct") {
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
  //not going to do much typechecking here as it'll be handled in the call
  //to tupleFromArray
  //Typescript complains if I try to say it can be either struct or
  //tuple, so, uh, let's just tell it it's a tuple <shrug>
  const coercedInput = <Format.Values.TupleValue>input; //HACK!
  //note that we do *not* just copy over input.value, but rather we
  //defer to tupleFromArray; this is because there might be some elements
  //where the type is not the same but is compatible
  return yield* tupleFromArray(
    dataType,
    coercedInput.value.map(({ value }) => value),
    wrapOptions
  );
}

function* tupleFromTypeValueInput(
  dataType: TupleLikeType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<WrapRequest, TupleLikeValue, WrapResponse> {
  if (!Utils.isTypeValueInput(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a type/value pair"
    );
  }
  if (input.type !== "tuple" && input.type !== "struct") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.specifiedTypeMessage(input.type)
    );
  }
  //don't turn on loose here, only do that for non-container types!
  return yield* wrapWithCases(
    dataType,
    input.value,
    wrapOptions,
    tupleCasesBasic
  );
}

function* tupleFailureCase(
  dataType: TupleLikeType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, never, WrapResponse> {
  throw new TypeMismatchError(
    dataType,
    input,
    wrapOptions.name,
    2,
    "Input was not an array, plain object, type/value pair or wrapped tuple or struct"
  );
}

function memberTypesForType(
  dataType: TupleLikeType,
  userDefinedTypes: Format.Types.TypesById
): Format.Types.OptionallyNamedType[] {
  switch (dataType.typeClass) {
    case "tuple":
      return dataType.memberTypes;
      break;
    case "struct":
      debug("wrapping for struct %s", dataType.typeName);
      return (<Format.Types.StructType>(
        Format.Types.fullType(dataType, userDefinedTypes)
      )).memberTypes;
  }
}

//udvt cases
function* udvtFromUnderlying(
  dataType: Format.Types.UserDefinedValueTypeType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<
  WrapRequest,
  Format.Values.UserDefinedValueTypeValue,
  WrapResponse
> {
  const { underlyingType } = <Format.Types.UserDefinedValueTypeType>(
    Format.Types.fullType(dataType, wrapOptions.userDefinedTypes)
  );
  const value = yield* wrap(underlyingType, input, wrapOptions);
  return {
    type: dataType,
    kind: "value",
    value: <Format.Values.BuiltInValueValue>value
  };
}

//tx options cases

function* optionsFromObject(
  dataType: Format.Types.OptionsType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<WrapRequest, Format.Values.OptionsValue, WrapResponse> {
  if (!Utils.isPlainObject(input)) {
    //just checks that it's an object & not null
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a non-null object"
    );
  }
  debug("options input is object: %O", input);
  debug("wrapOptions: %O", wrapOptions);
  if (!wrapOptions.loose && Utils.isWrappedResult(input)) {
    //similarly here
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was a wrapped result"
    );
  }
  //now... the main case
  let value: Options = {};
  const uintKeys = [
    "gas",
    "gasPrice",
    "value",
    "nonce",
    "maxFeePerGas",
    "maxPriorityFeePerGas"
  ] as const;
  const uint8Keys = ["type"] as const;
  const addressKeys = ["from", "to"] as const;
  const bytesKeys = ["data"] as const;
  const boolKeys = ["overwrite"] as const;
  const accessListKeys = ["accessList"] as const;
  const specialKeys = ["privateFor"];
  const allKeys = [
    ...uintKeys,
    ...uint8Keys,
    ...addressKeys,
    ...bytesKeys,
    ...boolKeys,
    ...accessListKeys,
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
      4,
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
      4,
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
        yield* wrapWithCases(
          { typeClass: "uint", bits: 256 },
          input[key],
          { ...wrapOptions, name: `${wrapOptions.name}.${key}` },
          integerCases
        )
      );
      value[key] = wrappedOption.value.asBN;
    }
  }
  //part 2: uint8 options (just type for now)
  for (const key of uint8Keys) {
    if (input[key] !== undefined) {
      const wrappedOption = <Format.Values.UintValue>(
        yield* wrapWithCases(
          { typeClass: "uint", bits: 8 },
          input[key],
          { ...wrapOptions, name: `${wrapOptions.name}.${key}` },
          integerCases
        )
      );
      const asBN = wrappedOption.value.asBN;
      //since this is just type right now, we're going to reject illegal types
      if (asBN.gten(0xc0)) {
        //not making a constant for this, this is its only use here
        throw new TypeMismatchError(
          dataType,
          input,
          `${wrapOptions.name}.type`,
          4,
          "Transaction types must be less than 0xc0"
        );
      }
      //for compatibility, we give type as a hex string rather than
      //leaving it as a BN.  Since it's unsigned we don't have to
      //worry about negatives.
      value[key] = Conversion.toHexString(asBN);
    }
  }
  //part 3: address options
  for (const key of addressKeys) {
    if (input[key] !== undefined) {
      const wrappedOption = <Format.Values.AddressValue>(
        yield* wrapWithCases(
          { typeClass: "address", kind: "general" },
          input[key],
          { ...wrapOptions, name: `${wrapOptions.name}.${key}` },
          addressCases
        )
      );
      value[key] = wrappedOption.value.asAddress;
    }
  }
  //part 4: bytestring options
  for (const key of bytesKeys) {
    if (input[key] !== undefined) {
      const wrappedOption = yield* wrapWithCases(
        { typeClass: "bytes", kind: "dynamic" },
        input[key],
        { ...wrapOptions, name: `${wrapOptions.name}.${key}` },
        bytesCases
      );
      value[key] = wrappedOption.value.asHex;
    }
  }
  //part 5: boolean options
  for (const key of boolKeys) {
    if (input[key] !== undefined) {
      const wrappedOption = yield* wrapWithCases(
        { typeClass: "bool" },
        input[key],
        { ...wrapOptions, name: `${wrapOptions.name}.${key}` },
        boolCases
      );
      value[key] = wrappedOption.value.asBoolean;
    }
  }
  //part 6: the access list
  for (const key of accessListKeys) {
    if (input[key] !== undefined) {
      const wrappedOption = yield* wrapWithCases(
        {
          typeClass: "array",
          kind: "dynamic",
          baseType: {
            typeClass: "tuple",
            memberTypes: [
              {
                name: "address",
                type: {
                  typeClass: "address",
                  kind: "general"
                }
              },
              {
                name: "storageKeys",
                type: {
                  typeClass: "array",
                  kind: "dynamic",
                  baseType: {
                    //we use uint256 rather than bytes32 to allow
                    //abbreviating and left-padding
                    typeClass: "uint",
                    bits: 256
                  }
                }
              }
            ]
          }
        },
        input[key],
        { ...wrapOptions, name: `${wrapOptions.name}.${key}` },
        arrayCases
      );
      value[key] = Format.Utils.Inspect.nativizeAccessList(wrappedOption);
    }
  }
  //part 7: the special case of privateFor
  if (input.privateFor !== undefined) {
    //this doesn't correspond to any of our usual types, so we have to handle it specially
    if (!Array.isArray(input.privateFor)) {
      throw new TypeMismatchError(
        dataType,
        input,
        `${wrapOptions.name}.privateFor`,
        4,
        "Transaction option privateFor should be an array of base64-encoded bytestrings of 32 bytes"
      );
    }
    value.privateFor = input.privateFor.map(
      (publicKey: unknown, index: number) => {
        if (Utils.isBoxedString(publicKey)) {
          publicKey = publicKey.valueOf();
        }
        if (typeof publicKey !== "string") {
          throw new TypeMismatchError(
            dataType,
            input,
            `${wrapOptions.name}.privateFor`,
            4,
            `Public key at index ${index} is not a string`
          );
        }
        if (!Utils.isBase64(publicKey)) {
          throw new TypeMismatchError(
            dataType,
            input,
            `${wrapOptions.name}.privateFor`,
            4,
            `Public key at index ${index} is not base64-encoded`
          );
        }
        const length = Utils.base64Length(publicKey);
        if (length !== 32) {
          throw new TypeMismatchError(
            dataType,
            input,
            `${wrapOptions.name}.privateFor`,
            4,
            `Public key at index ${index} should encode a bytestring of 32 bytes; got ${length} bytes instead`
          );
        }
        return publicKey;
      }
    );
  }
  return {
    type: dataType,
    kind: "value" as const,
    value
  };
}

function* optionsFromCodecOptionsValue(
  dataType: Format.Types.OptionsType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, Format.Values.OptionsValue, WrapResponse> {
  if (!Utils.isWrappedResult(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a wrapped result"
    );
  }
  if (input.type.typeClass !== "options") {
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
  const value = (<Format.Values.OptionsValue>input).value;
  //unlike in the array or tuple cases, here should not have
  //to worry about compatible-but-not-identical types, so it's
  //safe to just copy value over
  return {
    type: dataType,
    kind: "value" as const,
    value
  };
}

function* optionsFromTypeValueInput(
  dataType: Format.Types.OptionsType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<WrapRequest, Format.Values.OptionsValue, WrapResponse> {
  if (!Utils.isTypeValueInput(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a type/value pair"
    );
  }
  if (input.type !== "options") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.specifiedTypeMessage(input.type)
    );
  }
  //because options, unlike other containers, has specific types, we *will* turn on loose
  return yield* wrapWithCases(
    dataType,
    input.value,
    { ...wrapOptions, loose: true },
    txOptionsCasesBasic
  );
}

function* optionsFailureCase(
  dataType: Format.Types.OptionsType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, never, WrapResponse> {
  throw new TypeMismatchError(
    dataType,
    input,
    wrapOptions.name,
    2,
    "Transaction options input was not a plain object, type/value pair or wrapped options object"
  );
}
