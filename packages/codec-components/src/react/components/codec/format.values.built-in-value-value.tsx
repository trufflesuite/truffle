import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { UintValue } from "./format.values.uint-value";
import { IntValue } from "./format.values.int-value";
import { BoolValue } from "./format.values.bool-value";
import { BytesStaticValue } from "./format.values.bytes-static-value";
import { AddressValue } from "./format.values.address-value";
import { FixedValue } from "./format.values.fixed-value";
import { UfixedValue } from "./format.values.ufixed-value";
import {
  isUintValue,
  isIntValue,
  isBoolValue,
  isBytesStaticValue,
  isAddressValue,
  isFixedValue
} from "../../../utils";

export const { BuiltInValueValue } = createCodecComponent(
  "BuiltInValueValue",
  (data: Format.Values.BuiltInValueValue) =>
    isUintValue(data) ? (
      <UintValue data={data} />
    ) : isIntValue(data) ? (
      <IntValue data={data} />
    ) : isBoolValue(data) ? (
      <BoolValue data={data} />
    ) : isBytesStaticValue(data) ? (
      <BytesStaticValue data={data} />
    ) : isAddressValue(data) ? (
      <AddressValue data={data} />
    ) : isFixedValue(data) ? (
      <FixedValue data={data} />
    ) : (
      <UfixedValue data={data} />
    )
);
