import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { useInjectedNode } from "../../contexts/injected-node";
import { Code } from "../common/code";
import { FunctionInternalRawInfo } from "./format.values.function-internal-raw-info";

export const { FunctionInternalValueInfoUnknown } = createCodecComponent(
  "FunctionInternalValueInfoUnknown",
  ({
    context,
    rawInformation
  }: Format.Values.FunctionInternalValueInfoUnknown) => {
    const { prefix, content } = useInjectedNode();
    return (
      <Code>
        {prefix?.prefix}
        <Code type="contract" title="type: contract">
          {context.typeName}
        </Code>
        <Code type="period">.</Code>
        <FunctionInternalRawInfo data={rawInformation} />
        {content?.suffix}
      </Code>
    );
  }
);
