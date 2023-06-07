import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { EnumValue } from "./format.values.enum-value";

export const { TypeValueEnum } = createCodecComponent(
  "TypeValueEnum",
  ({ value }: Format.Values.TypeValueEnum) => (
    // TODO
    <>
      {value.map((enumValue, index) => (
        <EnumValue data={enumValue} key={index} />
      ))}
    </>
  )
);
