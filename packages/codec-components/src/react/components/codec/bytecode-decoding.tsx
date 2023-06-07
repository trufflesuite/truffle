import React from "react";
import type * as Codec from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { Code } from "../common/code";

export const { BytecodeDecoding } = createCodecComponent(
  "BytecodeDecoding",
  (data: Codec.BytecodeDecoding) => (
    <Code
      type="bytes"
      title={`${data.class.typeName} contract${
        data.address ? ` (${data.address})` : ""
      } bytecode`}
    >
      {data.bytecode}
    </Code>
  )
);
