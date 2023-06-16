import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { FunctionInternalRawInfoPcPair } from "./format.values.function-internal-raw-info-pc-pair";
import { FunctionInternalRawInfoIndex } from "./format.values.function-internal-raw-info-index";
import { isFunctionInternalRawInfoPcPair } from "../../../utils";

export const { FunctionInternalRawInfo } = createCodecComponent(
  "FunctionInternalRawInfo",
  (data: Format.Values.FunctionInternalRawInfo) =>
    isFunctionInternalRawInfoPcPair(data) ? (
      <FunctionInternalRawInfoPcPair data={data} />
    ) : (
      <FunctionInternalRawInfoIndex data={data} />
    )
);
