import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { useInjectedNode } from "../../contexts/injected-node";
import { Code } from "../common/code";
import { typeStringWithoutLocation } from "../../../utils";

export const { UintValue } = createCodecComponent(
  "UintValue",
  ({ value, type }: Format.Values.UintValue) => {
    const { prefix, content } = useInjectedNode();
    return (
      <Code type="number" title={`type: ${typeStringWithoutLocation(type)}`}>
        {prefix?.prefix}
        {value.asBN.toString()}
        {content?.suffix}
      </Code>
    );
  }
);
