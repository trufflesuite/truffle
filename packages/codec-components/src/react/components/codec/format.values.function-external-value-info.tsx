import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { FunctionExternalValueInfoKnown } from "./format.values.function-external-value-info-known";
import { FunctionExternalValueInfoInvalid } from "./format.values.function-external-value-info-invalid";
import { FunctionExternalValueInfoUnknown } from "./format.values.function-external-value-info-unknown";
import {
  isFunctionExternalValueInfoKnown,
  isFunctionExternalValueInfoInvalid
} from "../../../utils";

export const { FunctionExternalValueInfo } = createCodecComponent(
  "FunctionExternalValueInfo",
  (data: Format.Values.FunctionExternalValueInfo) =>
    isFunctionExternalValueInfoKnown(data) ? (
      <FunctionExternalValueInfoKnown data={data} />
    ) : isFunctionExternalValueInfoInvalid(data) ? (
      <FunctionExternalValueInfoInvalid data={data} />
    ) : (
      <FunctionExternalValueInfoUnknown data={data} />
    )
);
