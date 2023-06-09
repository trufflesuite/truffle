import React from "react";
import type * as Codec from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { Code } from "../common/code";

export const { UnknownCreationDecoding } = createCodecComponent(
  "UnknownCreationDecoding",
  ({ bytecode }: Codec.UnknownCreationDecoding) => (
    <Code type="bytes" title="contract (unknown) creation">
      {bytecode}
    </Code>
  )
);
