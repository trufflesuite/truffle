import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { useInjectedNode } from "../../contexts/injected-node";
import { Code } from "../common/code";

export const { FunctionInternalRawInfoPcPair } = createCodecComponent(
  "FunctionInternalRawInfoPcPair",
  ({
    deployedProgramCounter,
    constructorProgramCounter
  }: Format.Values.FunctionInternalRawInfoPcPair) => {
    const { prefix, content } = useInjectedNode();
    return (
      <Code>
        {prefix?.prefix}(constructor: {constructorProgramCounter}, deployed:{" "}
        {deployedProgramCounter}){content?.suffix}
      </Code>
    );
  }
);
