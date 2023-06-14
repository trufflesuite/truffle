import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { ContractValueInfoUnknown } from "./format.values.contract-value-info-unknown";
import { useInjectedNode } from "../../contexts/injected-node";
import { Code } from "../common/code";

export const { FunctionExternalValueInfoUnknown } = createCodecComponent(
  "FunctionExternalValueInfoUnknown",
  ({ contract, selector }: Format.Values.FunctionExternalValueInfoUnknown) => {
    const { prefix, content } = useInjectedNode();
    return (
      <Code>
        {prefix?.prefix}
        <ContractValueInfoUnknown data={contract} />
        <Code type="period">.</Code>
        <Code type="function">{selector}</Code>
        {content?.suffix}
      </Code>
    );
  }
);
