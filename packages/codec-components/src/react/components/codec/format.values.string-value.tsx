import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { StringValueInfo } from "./format.values.string-value-info";

export const { StringValue } = createCodecComponent(
  "StringValue",
  ({ value }: Format.Values.StringValue) => <StringValueInfo data={value} />
);
