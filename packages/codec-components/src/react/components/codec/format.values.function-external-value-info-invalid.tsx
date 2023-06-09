import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { ContractValueInfoKnown } from "./format.values.contract-value-info-known";
import { Code } from "../common/code";

export const { FunctionExternalValueInfoInvalid } = createCodecComponent(
  "FunctionExternalValueInfoInvalid",
  ({ contract, selector }: Format.Values.FunctionExternalValueInfoInvalid) => (
    <Code>
      <ContractValueInfoKnown data={contract} />
      <Code type="period">.</Code>
      <Code type="function">{selector}</Code>
    </Code>
  )
);
