import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { FunctionInternalValueInfoException } = createCodecComponent(
  "FunctionInternalValueInfoException",
  ({ context }: Format.Values.FunctionInternalValueInfoException) => (
    <CodecError kind="Exception">
      {context.typeName} uninitialized pointer
    </CodecError>
  )
);
