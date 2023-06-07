import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { useInjectedNode } from "../../contexts/injected-node";
import { Code } from "../common/code";

export const { StringValueInfoMalformed } = createCodecComponent(
  "StringValueInfoMalformed",
  (data: Format.Values.StringValueInfoMalformed) => {
    const { prefix, content } = useInjectedNode();
    return (
      <Code type="bytes" title={`type: string (${data.kind})`}>
        {prefix?.prefix}
        {data.asHex}
        {content?.suffix}
      </Code>
    );
  }
);
