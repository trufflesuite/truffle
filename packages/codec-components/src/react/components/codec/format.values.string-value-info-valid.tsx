import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { useInjectedNode } from "../../contexts/injected-node";
import { Code } from "../common/code";

export const { StringValueInfoValid } = createCodecComponent(
  "StringValueInfoValid",
  (data: Format.Values.StringValueInfoValid) => {
    const { prefix, content } = useInjectedNode();
    return (
      <Code type="string" title="type: string">
        {prefix?.prefix}"{data.asString}"{content?.suffix}
      </Code>
    );
  }
);
