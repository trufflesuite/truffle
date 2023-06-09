import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { useInjectedNode } from "../../contexts/injected-node";
import { Code } from "../common/code";

export const { ContractValueInfoUnknown } = createCodecComponent(
  "ContractValueInfoUnknown",
  ({ address }: Format.Values.ContractValueInfoUnknown) => {
    const { prefix, content } = useInjectedNode();
    return (
      <Code type="address" title="type: contract (unknown)">
        {prefix?.prefix}
        {address}
        {content?.suffix}
      </Code>
    );
  }
);
