import React from "react";
import type * as Codec from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { Code } from "../common/code";

export const { RawReturnDecoding } = createCodecComponent(
  "RawReturnDecoding",
  ({ data }: Codec.RawReturnDecoding) => (
    <Code type="bytes" title="raw return data">
      {data}
    </Code>
  )
);
