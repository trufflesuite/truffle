import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { useInjectedNode } from "../../contexts/injected-node";
import { Code } from "../common/code";
import { typeStringWithoutLocation } from "../../../utils";

export const { ContractValueInfoKnown } = createCodecComponent(
  "ContractValueInfoKnown",
  (data: Format.Values.ContractValueInfoKnown) => {
    const { prefix, content } = useInjectedNode();
    return (
      <Code
        type="contract"
        title={`type: ${typeStringWithoutLocation(data.class)} (${
          data.address
        })`}
      >
        {prefix?.prefix}
        {data.class.typeName}
        {content?.suffix}
      </Code>
    );
  }
);
