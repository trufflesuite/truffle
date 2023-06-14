import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { ContractValueInfoKnown } from "./format.values.contract-value-info-known";
import { useInjectedNode } from "../../contexts/injected-node";
import { Code } from "../common/code";

export const { FunctionExternalValueInfoKnown } = createCodecComponent(
  "FunctionExternalValueInfoKnown",
  ({ contract, abi }: Format.Values.FunctionExternalValueInfoKnown) => {
    const { prefix, content } = useInjectedNode();
    return (
      <Code>
        {prefix?.prefix}
        <ContractValueInfoKnown data={contract} />
        <Code type="period">.</Code>
        <Code type="function">{abi.name}</Code>
        {content?.suffix}
      </Code>
    );
  }
);
