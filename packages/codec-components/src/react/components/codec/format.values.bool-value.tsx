import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { useInjectedNode } from "../../contexts/injected-node";
import { Code } from "../common/code";
import { typeStringWithoutLocation } from "../../../utils";

export const { BoolValue } = createCodecComponent(
  "BoolValue",
  ({ value, type }: Format.Values.BoolValue) => {
    const { prefix, content } = useInjectedNode();
    return (
      <Code type="boolean" title={`type: ${typeStringWithoutLocation(type)}`}>
        {prefix?.prefix}
        {value.asBoolean.toString()}
        {content?.suffix}
      </Code>
    );
  }
);
