import React from "react";
import type * as Codec from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { Code } from "../common/code";

export const { UnknownCallDecoding } = createCodecComponent(
  "UnknownCallDecoding",
  ({ data }: Codec.UnknownCallDecoding) => (
    <Code type="bytes" title="data sent to contract (unknown)">
      {data}
    </Code>
  )
);
