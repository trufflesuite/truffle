import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { useInjectedNode } from "../../contexts/injected-node";
import { Code } from "../common/code";

export const { FunctionInternalRawInfoIndex } = createCodecComponent(
  "FunctionInternalRawInfoIndex",
  ({ functionIndex }: Format.Values.FunctionInternalRawInfoIndex) => {
    const { prefix, content } = useInjectedNode();
    return (
      <Code>
        {prefix?.prefix}(Function index: {functionIndex}){content?.suffix}
      </Code>
    );
  }
);
