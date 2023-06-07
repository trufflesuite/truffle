import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { useInjectedNode } from "../../contexts/injected-node";
import { Code } from "../common/code";
import { typeStringWithoutLocation } from "../../../utils";

export const { EnumValue } = createCodecComponent(
  "EnumValue",
  ({ value, type }: Format.Values.EnumValue) => {
    const { prefix, content } = useInjectedNode();
    return (
      <Code type="enum" title={`type: ${typeStringWithoutLocation(type)}`}>
        {prefix?.prefix}
        {value.name}
        {content?.suffix}
      </Code>
    );
  }
);
