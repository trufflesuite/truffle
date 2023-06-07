import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { BuiltInValueValue } from "./format.values.built-in-value-value";

export const { UserDefinedValueTypeValue } = createCodecComponent(
  "UserDefinedValueTypeValue",
  ({ value }: Format.Values.UserDefinedValueTypeValue) => (
    <BuiltInValueValue data={value} />
  )
);
