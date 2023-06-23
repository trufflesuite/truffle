import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { Code } from "../common/code";

export const { FunctionInternalRawInfoIndex } = createCodecComponent(
  "FunctionInternalRawInfoIndex",
  ({ functionIndex }: Format.Values.FunctionInternalRawInfoIndex) => {
    return <Code>(Function index: {functionIndex})</Code>;
  }
);
