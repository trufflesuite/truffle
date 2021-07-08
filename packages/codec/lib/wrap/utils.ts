import {
  NumericType,
  DecimalType,
  TypeValueInput,
  ContractInput,
  FunctionExternalInput,
  Uint8ArrayLikeInput,
  EncodingTextInput
} from "./types";
import * as Format from "@truffle/codec/format";
import Big from "big.js";
import * as Conversion from "@truffle/codec/conversion";

export function places(dataType: NumericType): number {
  switch (dataType.typeClass) {
    case "int":
    case "uint":
      return 0;
    case "fixed":
    case "ufixed":
      return dataType.places;
  }
}

export function maxValue(dataType: NumericType): Big {
  let bits = dataType.bits;
  if (dataType.typeClass === "int" || dataType.typeClass === "fixed") {
    bits -= 1; //subtract 1 for signed
  }
  const maxIntegerValue = new Big(2).pow(bits).minus(1);
  return Conversion.shiftBigDown(maxIntegerValue, places(dataType));
}

export function minValue(dataType: NumericType): Big {
  if (dataType.typeClass === "uint" || dataType.typeClass === "ufixed") {
    return new Big(0);
  }
  const minIntegerValue = new Big(0).minus(new Big(2).pow(dataType.bits));
  return Conversion.shiftBigDown(minIntegerValue, places(dataType));
}

export function isSafeNumber(dataType: DecimalType, input: number): boolean {
  const scaledUp = input * (10**dataType.places);
  return Number.MIN_SAFE_INTEGER <= scaledUp &&
    scaledUp <= Number.MAX_SAFE_INTEGER;
}

export function isTypeValueInput(input: any): input is TypeValueInput {
  return (
    typeof input === "object" &&
    input !== null &&
    typeof input.type === "string" &&
    "value" in input &&
    Object.keys(input).length === 2
  );
}

export function isEncodingTextInput(input: any): input is EncodingTextInput {
  return (
    typeof input === "object" &&
    input !== null &&
    typeof input.encoding === "string" &&
    typeof input.text === "string" &&
    Object.keys(input).length === 2
  );
}

export function isContractInput(input: any): input is ContractInput {
  return (
    typeof input === "object" &&
    input !== null &&
    typeof input.address === "string" &&
    //we *don't* check anything more for addresses, we'll let the
    //address wrapper handle that
    !("selector" in input)
  );
}

export function isFunctionExternalInput(
  input: any
): input is FunctionExternalInput {
  return (
    typeof input === "object" &&
    input !== null &&
    "address" in input &&
    "selector" in input
  );
}

export function isWrappedResult(input: any): input is Format.Values.Result {
  return (
    typeof input === "object" &&
    input !== null &&
    typeof input.type === "object" &&
    input.type !== null &&
    typeof input.type.typeClass === "string" &&
    ((input.kind === "value" && typeof input.value === "object") ||
      (input.kind === "error" && typeof input.error === "object"))
  );
}

export function isUint8ArrayLikeInput(
  input: any
): input is Uint8ArrayLikeInput {
  return (
    typeof input === "object" &&
    input !== null &&
    typeof input.length === "number"
  );
}

//hack?
export function isPlainObject(
  input: any
): input is { [key: string]: unknown } {
  return typeof input === "object" && input !== null;
}
