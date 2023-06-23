import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";
import { FunctionInternalRawInfoPcPair } from "./format.values.function-internal-raw-info-pc-pair";

export const { DeployedFunctionInConstructorError } = createCodecComponent(
  "DeployedFunctionInConstructorError",
  ({
    kind,
    context,
    rawInformation
  }: Format.Errors.DeployedFunctionInConstructorError) => (
    <CodecError kind={kind}>
      Deployed-style pointer in {context.typeName} constructor&nbsp;
      <FunctionInternalRawInfoPcPair data={rawInformation} />
    </CodecError>
  )
);
