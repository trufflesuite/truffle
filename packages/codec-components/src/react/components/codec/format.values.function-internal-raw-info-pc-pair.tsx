import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { Code } from "../common/code";

export const { FunctionInternalRawInfoPcPair } = createCodecComponent(
  "FunctionInternalRawInfoPcPair",
  ({
    deployedProgramCounter,
    constructorProgramCounter
  }: Format.Values.FunctionInternalRawInfoPcPair) => {
    return (
      <Code>
        (constructor: {constructorProgramCounter}, deployed:{" "}
        {deployedProgramCounter})
      </Code>
    );
  }
);
