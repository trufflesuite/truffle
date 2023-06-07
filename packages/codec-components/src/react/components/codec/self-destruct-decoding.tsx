import React from "react";
import type * as Codec from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { Code } from "../common/code";

export const { SelfDestructDecoding } = createCodecComponent(
  "SelfDestructDecoding",
  (_data: Codec.SelfDestructDecoding) => (
    <Code type="function">
      selfdestruct<Code type="bracket">()</Code>
    </Code>
  )
);
