import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { Code } from "../common/code";
import { typeStringWithoutLocation } from "../../../utils";

export const { ContractValueInfoKnown } = createCodecComponent(
  "ContractValueInfoKnown",
  (data: Format.Values.ContractValueInfoKnown) => (
    <Code
      type="contract"
      title={`type: ${typeStringWithoutLocation(data.class)} (${data.address})`}
    >
      {data.class.typeName}
    </Code>
  )
);
