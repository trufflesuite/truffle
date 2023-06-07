import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { UintValue } from "./format.values.uint-value";
import { IntValue } from "./format.values.int-value";
import { BoolValue } from "./format.values.bool-value";
import { BytesValue } from "./format.values.bytes-value";
import { AddressValue } from "./format.values.address-value";
import { StringValue } from "./format.values.string-value";
import { FixedValue } from "./format.values.fixed-value";
import { UfixedValue } from "./format.values.ufixed-value";
import { EnumValue } from "./format.values.enum-value";
import { UserDefinedValueTypeValue } from "./format.values.user-defined-value-type-value";
import { ContractValue } from "./format.values.contract-value";
import {
  isUintValue,
  isIntValue,
  isBoolValue,
  isBytesValue,
  isAddressValue,
  isStringValue,
  isFixedValue,
  isUfixedValue,
  isEnumValue,
  isUserDefinedValueTypeValue
} from "../../../utils";

export const { ElementaryValue } = createCodecComponent(
  "ElementaryValue",
  (data: Format.Values.ElementaryValue) =>
    isUintValue(data) ? (
      <UintValue data={data} />
    ) : isIntValue(data) ? (
      <IntValue data={data} />
    ) : isBoolValue(data) ? (
      <BoolValue data={data} />
    ) : isBytesValue(data) ? (
      <BytesValue data={data} />
    ) : isAddressValue(data) ? (
      <AddressValue data={data} />
    ) : isStringValue(data) ? (
      <StringValue data={data} />
    ) : isFixedValue(data) ? (
      <FixedValue data={data} />
    ) : isUfixedValue(data) ? (
      <UfixedValue data={data} />
    ) : isEnumValue(data) ? (
      <EnumValue data={data} />
    ) : isUserDefinedValueTypeValue(data) ? (
      <UserDefinedValueTypeValue data={data} />
    ) : (
      <ContractValue data={data} />
    )
);
