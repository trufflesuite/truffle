import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";
import { FunctionInternalRawInfoPcPair } from "./format.values.function-internal-raw-info-pc-pair";

export const { MalformedInternalFunctionError } = createCodecComponent(
  "MalformedInternalFunctionError",
  ({
    kind,
    context,
    rawInformation
  }: Format.Errors.MalformedInternalFunctionError) => (
    <CodecError kind={kind}>
      {context.typeName} pointer has zero deployed program counter
      <FunctionInternalRawInfoPcPair data={rawInformation} />
    </CodecError>
  )
);
