import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { useInjectedNode } from "../../contexts/injected-node";
import { Code } from "../common/code";
import { typeStringWithoutLocation } from "../../../utils";

export const { BytesStaticValue } = createCodecComponent(
  "BytesStaticValue",
  ({ value, type }: Format.Values.BytesStaticValue) => {
    const { prefix, content } = useInjectedNode();
    return (
      <Code type="bytes" title={`type: ${typeStringWithoutLocation(type)}`}>
        {prefix?.prefix}
        {value.asHex}
        {content?.suffix}
      </Code>
    );
  }
);
