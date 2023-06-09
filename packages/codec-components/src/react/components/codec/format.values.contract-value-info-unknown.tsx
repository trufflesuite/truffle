import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { Code } from "../common/code";

export const { ContractValueInfoUnknown } = createCodecComponent(
  "ContractValueInfoUnknown",
  ({ address }: Format.Values.ContractValueInfoUnknown) => (
    <Code type="address" title="type: contract (unknown)">
      {address}
    </Code>
  )
);
