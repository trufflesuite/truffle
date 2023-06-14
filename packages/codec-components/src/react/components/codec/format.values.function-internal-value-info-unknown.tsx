import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { useInjectedNode } from "../../contexts/injected-node";
import { Code } from "../common/code";

export const { FunctionInternalValueInfoUnknown } = createCodecComponent(
  "FunctionInternalValueInfoUnknown",
  ({ context }: Format.Values.FunctionInternalValueInfoUnknown) => {
    const { prefix, content } = useInjectedNode();
    return (
      <Code>
        {prefix?.prefix}
        <Code type="contract" title="type: contract">
          {context.typeName}
        </Code>
        <Code type="period">.</Code>
        <Code type="function">?</Code>
        {content?.suffix}
      </Code>
    );
  }
);
