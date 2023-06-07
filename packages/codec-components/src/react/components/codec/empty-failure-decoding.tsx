import React from "react";
import type * as Codec from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { Code } from "../common/code";

export const { EmptyFailureDecoding } = createCodecComponent(
  "EmptyFailureDecoding",
  (_data: Codec.EmptyFailureDecoding) => (
    <Code type="revert-keyword">
      revert<Code type="bracket">()</Code>
    </Code>
  )
);
