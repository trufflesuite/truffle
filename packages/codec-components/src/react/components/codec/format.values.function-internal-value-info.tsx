import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { FunctionInternalValueInfoKnown } from "./format.values.function-internal-value-info-known";
import { FunctionInternalValueInfoException } from "./format.values.function-internal-value-info-exception";
import { FunctionInternalValueInfoUnknown } from "./format.values.function-internal-value-info-unknown";
import {
  isFunctionInternalValueInfoKnown,
  isFunctionInternalValueInfoException
} from "../../../utils";

export const { FunctionInternalValueInfo } = createCodecComponent(
  "FunctionInternalValueInfo",
  (data: Format.Values.FunctionInternalValueInfo) =>
    isFunctionInternalValueInfoKnown(data) ? (
      <FunctionInternalValueInfoKnown data={data} />
    ) : isFunctionInternalValueInfoException(data) ? (
      <FunctionInternalValueInfoException data={data} />
    ) : (
      <FunctionInternalValueInfoUnknown data={data} />
    )
);
