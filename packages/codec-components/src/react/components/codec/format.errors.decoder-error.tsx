import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { UintError } from "./format.errors.uint-error";
import { IntError } from "./format.errors.int-error";
import { BoolError } from "./format.errors.bool-error";
import { BytesStaticError } from "./format.errors.bytes-static-error";
import { BytesDynamicError } from "./format.errors.bytes-dynamic-error";
import { AddressError } from "./format.errors.address-error";
import { StringError } from "./format.errors.string-error";
import { FixedError } from "./format.errors.fixed-error";
import { UfixedError } from "./format.errors.ufixed-error";
import { ArrayError } from "./format.errors.array-error";
import { MappingError } from "./format.errors.mapping-error";
import { StructError } from "./format.errors.struct-error";
import { MagicError } from "./format.errors.magic-error";
import { TypeErrorUnion } from "./format.errors.type-error-union";
import { TupleError } from "./format.errors.tuple-error";
import { EnumError } from "./format.errors.enum-error";
import { UserDefinedValueTypeError } from "./format.errors.user-defined-value-type-error";
import { ContractError } from "./format.errors.contract-error";
import { FunctionExternalError } from "./format.errors.function-external-error";
import { FunctionInternalError } from "./format.errors.function-internal-error";
import { InternalUseError } from "./format.errors.internal-use-error";
import { GenericError } from "./format.errors.generic-error";
import {
  isUintError,
  isIntError,
  isBoolError,
  isBytesStaticError,
  isBytesDynamicError,
  isAddressError,
  isStringError,
  isFixedError,
  isUfixedError,
  isArrayError,
  isMappingError,
  isStructError,
  isMagicError,
  isTypeErrorUnion,
  isTupleError,
  isEnumError,
  isUserDefinedValueTypeError,
  isContractError,
  isFunctionExternalError,
  isFunctionInternalError,
  isInternalUseError
} from "../../../utils";

export const { DecoderError } = createCodecComponent(
  "DecoderError",
  (data: Format.Errors.DecoderError) =>
    isUintError(data) ? (
      <UintError data={data} />
    ) : isIntError(data) ? (
      <IntError data={data} />
    ) : isBoolError(data) ? (
      <BoolError data={data} />
    ) : isBytesStaticError(data) ? (
      <BytesStaticError data={data} />
    ) : isBytesDynamicError(data) ? (
      <BytesDynamicError data={data} />
    ) : isAddressError(data) ? (
      <AddressError data={data} />
    ) : isStringError(data) ? (
      <StringError data={data} />
    ) : isFixedError(data) ? (
      <FixedError data={data} />
    ) : isUfixedError(data) ? (
      <UfixedError data={data} />
    ) : isArrayError(data) ? (
      <ArrayError data={data} />
    ) : isMappingError(data) ? (
      <MappingError data={data} />
    ) : isStructError(data) ? (
      <StructError data={data} />
    ) : isMagicError(data) ? (
      <MagicError data={data} />
    ) : isTypeErrorUnion(data) ? (
      <TypeErrorUnion data={data} />
    ) : isTupleError(data) ? (
      <TupleError data={data} />
    ) : isEnumError(data) ? (
      <EnumError data={data} />
    ) : isUserDefinedValueTypeError(data) ? (
      <UserDefinedValueTypeError data={data} />
    ) : isContractError(data) ? (
      <ContractError data={data} />
    ) : isFunctionExternalError(data) ? (
      <FunctionExternalError data={data} />
    ) : isFunctionInternalError(data) ? (
      <FunctionInternalError data={data} />
    ) : isInternalUseError(data) ? (
      <InternalUseError data={data} />
    ) : (
      <GenericError data={data} />
    )
);
